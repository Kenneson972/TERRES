from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, date, timezone
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class Reservation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    formule: str  # sejour_semaine, weekend_simple, weekend_fete, evenement_journee
    date_debut: str
    date_fin: str
    nom_client: str
    email_client: EmailStr
    telephone_client: str
    nombre_personnes: int
    montant_total: float
    mode_paiement: str  # 1x, 2x, 3x, 4x
    statut_paiement: str = "en_attente"  # en_attente, partiel, complet, annule
    date_creation: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReservationCreate(BaseModel):
    formule: str
    date_debut: str
    date_fin: str
    nom_client: str
    email_client: EmailStr
    telephone_client: str
    nombre_personnes: int
    montant_total: float
    mode_paiement: str

class BlocageManuel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date_debut: str
    date_fin: str
    raison: str
    cree_le: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlocageCreate(BaseModel):
    date_debut: str
    date_fin: str
    raison: str

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class CalendarAvailability(BaseModel):
    reservations: List[dict]
    blocages: List[dict]

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def check_date_overlap(date_debut: str, date_fin: str, existing_reservations: list, existing_blocages: list) -> bool:
    """Check if dates overlap with existing reservations or blocages"""
    debut = datetime.fromisoformat(date_debut).date()
    fin = datetime.fromisoformat(date_fin).date()
    
    # Check reservations
    for res in existing_reservations:
        res_debut = datetime.fromisoformat(res['date_debut']).date()
        res_fin = datetime.fromisoformat(res['date_fin']).date()
        if not (fin < res_debut or debut > res_fin):
            return True
    
    # Check blocages
    for bloc in existing_blocages:
        bloc_debut = datetime.fromisoformat(bloc['date_debut']).date()
        bloc_fin = datetime.fromisoformat(bloc['date_fin']).date()
        if not (fin < bloc_debut or debut > bloc_fin):
            return True
    
    return False

# Routes
@api_router.get("/")
async def root():
    return {"message": "Villa Rental API"}

# Authentication
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    # Default credentials - should be stored in database in production
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH', pwd_context.hash('admin123'))
    
    if credentials.username != ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(credentials.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": credentials.username})
    return LoginResponse(access_token=access_token)

# Calendar endpoints
@api_router.get("/calendar/availability", response_model=CalendarAvailability)
async def get_calendar_availability():
    """Get all reservations and manual blocages for calendar"""
    reservations = await db.reservations.find(
        {"statut_paiement": {"$ne": "annule"}}
    ).to_list(1000)
    
    blocages = await db.blocages_manuels.find().to_list(1000)
    
    # Clean up _id for JSON serialization
    for res in reservations:
        res.pop('_id', None)
    for bloc in blocages:
        bloc.pop('_id', None)
    
    return CalendarAvailability(reservations=reservations, blocages=blocages)

# Reservations
@api_router.post("/reservations", response_model=Reservation)
async def create_reservation(reservation: ReservationCreate):
    """Create a new reservation"""
    # Get existing data
    existing_reservations = await db.reservations.find(
        {"statut_paiement": {"$ne": "annule"}}
    ).to_list(1000)
    existing_blocages = await db.blocages_manuels.find().to_list(1000)
    
    # Check for overlaps
    if check_date_overlap(
        reservation.date_debut,
        reservation.date_fin,
        existing_reservations,
        existing_blocages
    ):
        raise HTTPException(
            status_code=400,
            detail="Ces dates ne sont pas disponibles"
        )
    
    # Create reservation
    reservation_obj = Reservation(**reservation.dict())
    reservation_dict = reservation_obj.dict()
    reservation_dict['date_creation'] = reservation_dict['date_creation'].isoformat()
    
    await db.reservations.insert_one(reservation_dict)
    
    return reservation_obj

@api_router.get("/reservations", response_model=List[Reservation])
async def get_reservations(username: str = Depends(verify_token)):
    """Get all reservations (protected route)"""
    reservations = await db.reservations.find().to_list(1000)
    result = []
    for res in reservations:
        res.pop('_id', None)
        result.append(Reservation(**res))
    return result

@api_router.get("/reservations/{reservation_id}", response_model=Reservation)
async def get_reservation(reservation_id: str):
    """Get a specific reservation"""
    reservation = await db.reservations.find_one({"id": reservation_id})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    reservation.pop('_id', None)
    return Reservation(**reservation)

# Manual blocages (protected)
@api_router.post("/blocages", response_model=BlocageManuel)
async def create_blocage(blocage: BlocageCreate, username: str = Depends(verify_token)):
    """Create a manual blocage (owner only)"""
    blocage_obj = BlocageManuel(**blocage.dict())
    blocage_dict = blocage_obj.dict()
    blocage_dict['cree_le'] = blocage_dict['cree_le'].isoformat()
    
    await db.blocages_manuels.insert_one(blocage_dict)
    return blocage_obj

@api_router.get("/blocages", response_model=List[BlocageManuel])
async def get_blocages(username: str = Depends(verify_token)):
    """Get all manual blocages (owner only)"""
    blocages = await db.blocages_manuels.find().to_list(1000)
    result = []
    for bloc in blocages:
        bloc.pop('_id', None)
        result.append(BlocageManuel(**bloc))
    return result

@api_router.delete("/blocages/{blocage_id}")
async def delete_blocage(blocage_id: str, username: str = Depends(verify_token)):
    """Delete a manual blocage (owner only)"""
    result = await db.blocages_manuels.delete_one({"id": blocage_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blocage not found")
    return {"message": "Blocage deleted"}

# Statistics (protected)
@api_router.get("/stats")
async def get_statistics(username: str = Depends(verify_token)):
    """Get statistics for dashboard"""
    total_reservations = await db.reservations.count_documents({})
    confirmed_reservations = await db.reservations.count_documents(
        {"statut_paiement": "complet"}
    )
    pending_reservations = await db.reservations.count_documents(
        {"statut_paiement": "en_attente"}
    )
    
    # Calculate total revenue
    all_reservations = await db.reservations.find(
        {"statut_paiement": {"$in": ["complet", "partiel"]}}
    ).to_list(1000)
    
    total_revenue = sum(res.get('montant_total', 0) for res in all_reservations)
    
    return {
        "total_reservations": total_reservations,
        "confirmed_reservations": confirmed_reservations,
        "pending_reservations": pending_reservations,
        "total_revenue": total_revenue
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
