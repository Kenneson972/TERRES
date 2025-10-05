import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Menu, X, Phone, Mail, MapPin, Facebook, Instagram, MessageCircle, Calendar as CalendarIcon, Users, Home as HomeIcon, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Formulas data
const FORMULES = [
  {
    id: 'sejour_semaine',
    nom: 'Séjour Simple',
    prix: 3000,
    duree: '7 jours consécutifs',
    description: 'Une semaine complète de détente dans notre villa',
    details: [
      '7 jours et 7 nuits',
      'Jusqu\'à 80 personnes',
      'Accès piscine privée',
      'Équipements complets',
      'Arrivée flexible'
    ],
    popular: false
  },
  {
    id: 'weekend_simple',
    nom: 'Week-end Simple',
    prix: 800,
    duree: 'Vendredi 18h - Dimanche 20h',
    description: 'Évadez-vous le temps d\'un week-end',
    details: [
      '2 nuits complètes',
      'Jusqu\'à 80 personnes',
      'Check-in vendredi 18h',
      'Check-out dimanche 20h',
      'Piscine et espaces extérieurs'
    ],
    popular: false
  },
  {
    id: 'weekend_fete',
    nom: 'Week-end avec Fête',
    prix: 1500,
    duree: 'Samedi 9h - Dimanche 21h',
    description: 'Parfait pour vos événements et célébrations',
    details: [
      'Samedi 9h au dimanche 21h',
      '80 personnes maximum',
      'Idéal anniversaires et mariages',
      'Espaces de réception',
      'Sonorisation possible'
    ],
    popular: true
  },
  {
    id: 'evenement_journee',
    nom: 'Événement Journée',
    prix: 1000,
    duree: '9h - 20h (Lun-Jeu)',
    description: 'Location à la journée pour vos événements',
    details: [
      'Horaires 9h - 20h',
      '80 personnes maximum',
      'Lundi à jeudi uniquement',
      'Parfait pour événements pro',
      'Configuration sur mesure'
    ],
    popular: false
  }
];

// Home Component
const Home = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedFormule, setSelectedFormule] = useState(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [blocages, setBlocages] = useState([]);
  const [selectedDates, setSelectedDates] = useState({ from: null, to: null });
  const [bookingForm, setBookingForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    nombrePersonnes: '',
    modePaiement: '1x'
  });

  const images = {
    hero: 'https://customer-assets.emergentagent.com/job_villarental/artifacts/v9wedq6e_IMG_9650.jpeg',
    gallery: [
      'https://customer-assets.emergentagent.com/job_villarental/artifacts/v9wedq6e_IMG_9650.jpeg',
      'https://customer-assets.emergentagent.com/job_villarental/artifacts/2xzjs8yb_IMG_9651.jpeg',
      'https://customer-assets.emergentagent.com/job_villarental/artifacts/gxd6nps1_IMG_9645.jpeg',
      'https://customer-assets.emergentagent.com/job_villarental/artifacts/ygz7r35z_IMG_9644.jpeg',
      'https://customer-assets.emergentagent.com/job_villarental/artifacts/j8b3zaod_IMG_9643.jpeg'
    ]
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      const response = await axios.get(`${API}/calendar/availability`);
      setReservations(response.data.reservations || []);
      setBlocages(response.data.blocages || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    }
  };

  const isDateBlocked = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Check reservations
    for (const res of reservations) {
      const start = new Date(res.date_debut);
      const end = new Date(res.date_fin);
      if (date >= start && date <= end) return true;
    }
    
    // Check blocages
    for (const bloc of blocages) {
      const start = new Date(bloc.date_debut);
      const end = new Date(bloc.date_fin);
      if (date >= start && date <= end) return true;
    }
    
    return false;
  };

  const handleFormuleSelect = (formule) => {
    setSelectedFormule(formule);
    setShowBookingDialog(true);
    setSelectedDates({ from: null, to: null });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDates.from || !selectedDates.to) {
      toast.error('Veuillez sélectionner des dates');
      return;
    }

    try {
      const reservationData = {
        formule: selectedFormule.id,
        date_debut: selectedDates.from.toISOString(),
        date_fin: selectedDates.to.toISOString(),
        nom_client: bookingForm.nom,
        email_client: bookingForm.email,
        telephone_client: bookingForm.telephone,
        nombre_personnes: parseInt(bookingForm.nombrePersonnes),
        montant_total: selectedFormule.prix,
        mode_paiement: bookingForm.modePaiement
      };

      await axios.post(`${API}/reservations`, reservationData);
      toast.success('Réservation créée avec succès!');
      setShowBookingDialog(false);
      fetchCalendarData();
      
      // Reset form
      setBookingForm({
        nom: '',
        email: '',
        telephone: '',
        nombrePersonnes: '',
        modePaiement: '1x'
      });
      setSelectedDates({ from: null, to: null });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réservation');
    }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="home-container">
      {/* Top Contact Bar */}
      <div className="top-contact-bar">
        <div className="container">
          <div className="contact-items">
            <a href="tel:+596696000000" className="contact-item">
              <Phone size={16} />
              <span>+596 696 XX XX XX</span>
            </a>
            <a href="mailto:contact@villa-martinique.com" className="contact-item">
              <Mail size={16} />
              <span>contact@villa-martinique.com</span>
            </a>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="navbar">
        <div className="container">
          <div className="nav-content">
            <div className="logo" onClick={() => navigate('/')}>
              <HomeIcon size={32} />
              <span>Terre d'Évasion</span>
            </div>
            
            <div className="desktop-menu">
              <button onClick={() => navigate('/')} className="nav-link">Accueil</button>
              <button onClick={() => navigate('/formules')} className="nav-link">Formules</button>
              <button onClick={() => navigate('/calendrier')} className="nav-link">Calendrier</button>
              <button onClick={() => navigate('/galerie')} className="nav-link">Galerie</button>
              <button onClick={() => navigate('/partenaires')} className="nav-link">Partenaires</button>
              <button onClick={() => navigate('/contact')} className="nav-link">Contact</button>
            </div>

            <div className="nav-actions">
              <div className="social-icons">
                <a href="#" className="social-icon"><Facebook size={20} /></a>
                <a href="#" className="social-icon"><Instagram size={20} /></a>
                <a href="#" className="social-icon"><MessageCircle size={20} /></a>
              </div>
              <Button data-testid="reserver-btn" className="cta-button" onClick={() => navigate('/formules')}>
                RÉSERVER
              </Button>
              <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="mobile-menu">
              <button onClick={() => { navigate('/'); setMobileMenuOpen(false); }} className="mobile-nav-link">Accueil</button>
              <button onClick={() => { navigate('/formules'); setMobileMenuOpen(false); }} className="mobile-nav-link">Formules</button>
              <button onClick={() => { navigate('/calendrier'); setMobileMenuOpen(false); }} className="mobile-nav-link">Calendrier</button>
              <button onClick={() => { navigate('/galerie'); setMobileMenuOpen(false); }} className="mobile-nav-link">Galerie</button>
              <button onClick={() => { navigate('/partenaires'); setMobileMenuOpen(false); }} className="mobile-nav-link">Partenaires</button>
              <button onClick={() => { navigate('/contact'); setMobileMenuOpen(false); }} className="mobile-nav-link">Contact</button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="accueil" className="hero-section">
        <video 
          className="hero-video" 
          autoPlay 
          loop 
          muted 
          playsInline
          poster={images.hero}
        >
          <source src="https://customer-assets.emergentagent.com/job_villarental/artifacts/rsa6tvb7_308498c1-b147-4585-aeff-9a79443d77b5.mov" type="video/quicktime" />
          <source src="https://customer-assets.emergentagent.com/job_villarental/artifacts/rsa6tvb7_308498c1-b147-4585-aeff-9a79443d77b5.mov" type="video/mp4" />
        </video>
        <div className="hero-image" style={{ backgroundImage: `url(${images.hero})` }}></div>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Terre d'Évasion - Votre Villa de Rêve en Martinique</h1>
          <p className="hero-subtitle">Jusqu'à 80 personnes | Piscine | Événements | Séjours</p>
          <div className="hero-buttons">
            <Button data-testid="decouvrir-formules-btn" size="lg" className="hero-btn-primary" onClick={() => navigate('/formules')}>
              DÉCOUVRIR NOS FORMULES
            </Button>
            <Button data-testid="voir-calendrier-btn" size="lg" variant="outline" className="hero-btn-secondary" onClick={() => navigate('/calendrier')}>
              VOIR LE CALENDRIER
            </Button>
          </div>
          <div className="scroll-indicator">
            <div className="scroll-arrow"></div>
          </div>
        </div>
      </section>

      {/* Formules Section */}
      <section id="formules" className="formules-section">
        <div className="container">
          <h2 className="section-title">Nos Formules de Location</h2>
          <p className="section-subtitle">Choisissez la formule qui correspond à vos besoins</p>
          
          <div className="formules-grid">
            {FORMULES.map((formule) => (
              <Card key={formule.id} className={`formule-card ${formule.popular ? 'popular' : ''}`}>
                {formule.popular && <div className="popular-badge">POPULAIRE</div>}
                <CardHeader>
                  <CardTitle className="formule-title">{formule.nom}</CardTitle>
                  <div className="formule-prix">{formule.prix}€</div>
                  <CardDescription className="formule-duree">{formule.duree}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="formule-description">{formule.description}</p>
                  <ul className="formule-details">
                    {formule.details.map((detail, idx) => (
                      <li key={idx}>
                        <CheckCircle size={16} />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    data-testid={`reserver-${formule.id}-btn`}
                    className="formule-btn" 
                    onClick={() => handleFormuleSelect(formule)}
                  >
                    RÉSERVER CETTE FORMULE
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Calendrier Section */}
      <section id="calendrier" className="calendrier-section">
        <div className="container">
          <h2 className="section-title">Vérifiez les Disponibilités</h2>
          <p className="section-subtitle">Les disponibilités sont mises à jour en temps réel</p>
          
          <div className="calendar-wrapper">
            <div className="calendar-legend">
              <div className="legend-item">
                <div className="legend-color available"></div>
                <span>Disponible</span>
              </div>
              <div className="legend-item">
                <div className="legend-color blocked"></div>
                <span>Réservé</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Galerie Section */}
      <section id="galerie" className="galerie-section">
        <div className="container">
          <h2 className="section-title">Découvrez la Villa</h2>
          <p className="section-subtitle">Des espaces pensés pour votre confort et vos événements</p>
          
          <div className="gallery-grid">
            {images.gallery.map((img, idx) => (
              <div key={idx} className="gallery-item">
                <img src={img} alt={`Villa ${idx + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Caractéristiques Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Caractéristiques</h2>
          <div className="features-grid">
            <div className="feature-item">
              <Users size={32} />
              <h3>Capacité 80 personnes</h3>
              <p>Idéal pour événements et grands groupes</p>
            </div>
            <div className="feature-item">
              <HomeIcon size={32} />
              <h3>Villa spacieuse</h3>
              <p>Espaces intérieurs et extérieurs généreux</p>
            </div>
            <div className="feature-item">
              <CalendarIcon size={32} />
              <h3>Piscine privée</h3>
              <p>Profitez d'une piscine exclusive</p>
            </div>
          </div>
        </div>
      </section>

      {/* Partenaires Section */}
      <section id="partenaires" className="partenaires-section">
        <div className="container">
          <h2 className="section-title">Nos Partenaires de Confiance</h2>
          <p className="section-subtitle">Des services complémentaires pour un séjour parfait</p>
          
          <div className="partenaires-grid">
            <Card className="partenaire-card">
              <CardHeader>
                <CardTitle>Location de Véhicule</CardTitle>
                <CardDescription>Déplacez-vous en toute liberté pendant votre séjour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="partenaire-contact">
                  <p><Phone size={16} /> +596 696 XX XX XX</p>
                  <p><Mail size={16} /> location@exemple.mq</p>
                </div>
                <Button data-testid="reserver-vehicule-btn" className="partenaire-btn">
                  RÉSERVER UN VÉHICULE
                </Button>
              </CardContent>
            </Card>

            <Card className="partenaire-card">
              <CardHeader>
                <CardTitle>Chef à Domicile</CardTitle>
                <CardDescription>Savourez des plats raffinés préparés sur place</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="partenaire-contact">
                  <p><Phone size={16} /> +596 696 XX XX XX</p>
                  <p><Mail size={16} /> chef@exemple.mq</p>
                </div>
                <Button data-testid="prendre-rdv-chef-btn" className="partenaire-btn">
                  PRENDRE RDV
                </Button>
              </CardContent>
            </Card>

            <Card className="partenaire-card">
              <CardHeader>
                <CardTitle>Massage & Bien-être</CardTitle>
                <CardDescription>Détendez-vous avec nos prestations bien-être</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="partenaire-contact">
                  <p><Phone size={16} /> +596 696 XX XX XX</p>
                  <p><Mail size={16} /> spa@exemple.mq</p>
                </div>
                <Button data-testid="reserver-seance-spa-btn" className="partenaire-btn">
                  RÉSERVER UNE SÉANCE
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="container">
          <h2 className="section-title">Questions Fréquentes</h2>
          
          <Accordion type="single" collapsible className="faq-accordion">
            <AccordionItem value="item-1">
              <AccordionTrigger>Quelles sont les conditions d'annulation ?</AccordionTrigger>
              <AccordionContent>
                Annulation gratuite jusqu'à 30 jours avant l'arrivée. Entre 30 et 15 jours : remboursement de 50%. Moins de 15 jours : aucun remboursement.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Une caution est-elle demandée ?</AccordionTrigger>
              <AccordionContent>
                Oui, une caution de 500€ est demandée à l'arrivée. Elle est restituée dans les 7 jours suivant le départ si aucun dégât n'est constaté.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Les animaux sont-ils acceptés ?</AccordionTrigger>
              <AccordionContent>
                Les animaux de compagnie ne sont pas acceptés dans la villa pour des raisons d'hygiène et de confort de tous.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Le paiement est-il sécurisé ?</AccordionTrigger>
              <AccordionContent>
                Oui, tous les paiements sont traités de manière sécurisée. Nous acceptons les paiements en une fois ou en plusieurs fois selon le montant.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="container">
          <h2 className="section-title">Contactez-nous</h2>
          
          <div className="contact-grid">
            <div className="contact-form-wrapper">
              <form className="contact-form">
                <div className="form-group">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input id="name" placeholder="Votre nom" />
                </div>
                <div className="form-group">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="votre@email.com" />
                </div>
                <div className="form-group">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" placeholder="+596 696 XX XX XX" />
                </div>
                <div className="form-group">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Votre message..." rows={4} />
                </div>
                <Button data-testid="envoyer-message-btn" type="submit" className="submit-btn">
                  ENVOYER LE MESSAGE
                </Button>
              </form>
            </div>
            
            <div className="contact-info-wrapper">
              <div className="contact-info">
                <h3>Coordonnées</h3>
                <div className="info-item">
                  <MapPin size={20} />
                  <span>QUARTIER BELEME 138 impasse Jean Calixte<br/>97232 LE LAMENTIN</span>
                </div>
                <div className="info-item">
                  <Phone size={20} />
                  <span>+596 696 XX XX XX</span>
                </div>
                <div className="info-item">
                  <Mail size={20} />
                  <span>contact@terredevasion.com</span>
                </div>
              </div>
              
              <div className="map-placeholder">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3781.234567890123!2d-60.9876543!3d14.6123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTTCsDM2JzQ0LjQiTiA2MMKwNTknMTUuNiJX!5e0!3m2!1sfr!2sfr!4v1234567890123!5m2!1sfr!2sfr&q=QUARTIER+BELEME+138+impasse+Jean+Calixte+97232+LE+LAMENTIN"
                  width="100%" 
                  height="300" 
                  style={{ border: 0 }} 
                  allowFullScreen="" 
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <h4>Terre d'Évasion</h4>
              <p>Votre havre de paix en Martinique pour des séjours et événements inoubliables.</p>
            </div>
            <div className="footer-col">
              <h4>Navigation</h4>
              <ul>
                <li><button onClick={() => navigate('/')}>Accueil</button></li>
                <li><button onClick={() => navigate('/formules')}>Formules</button></li>
                <li><button onClick={() => navigate('/calendrier')}>Calendrier</button></li>
                <li><button onClick={() => navigate('/contact')}>Contact</button></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Contact</h4>
              <ul>
                <li>+596 696 XX XX XX</li>
                <li>contact@terredevasion.com</li>
                <li>QUARTIER BELEME 138<br/>97232 LE LAMENTIN</li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Suivez-nous</h4>
              <div className="footer-social">
                <a href="#" className="footer-social-icon"><Facebook size={24} /></a>
                <a href="#" className="footer-social-icon"><Instagram size={24} /></a>
                <a href="#" className="footer-social-icon"><MessageCircle size={24} /></a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Terre d'Évasion. Tous droits réservés.</p>
            <div className="footer-links">
              <a href="#">Mentions légales</a>
              <a href="#">CGV</a>
              <a href="#">Politique de confidentialité</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="booking-dialog">
          <DialogHeader>
            <DialogTitle>Réserver : {selectedFormule?.nom}</DialogTitle>
            <DialogDescription>
              Prix : {selectedFormule?.prix}€ | {selectedFormule?.duree}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleBookingSubmit} className="booking-form">
            <div className="form-group">
              <Label>Sélectionnez vos dates</Label>
              <p className="form-hint">Les dates déjà réservées ne sont pas sélectionnables</p>
            </div>

            <div className="form-group">
              <Label htmlFor="nom">Nom complet *</Label>
              <Input 
                id="nom"
                value={bookingForm.nom}
                onChange={(e) => setBookingForm({...bookingForm, nom: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <Label htmlFor="email">Email *</Label>
              <Input 
                id="email"
                type="email"
                value={bookingForm.email}
                onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <Label htmlFor="telephone">Téléphone *</Label>
              <Input 
                id="telephone"
                value={bookingForm.telephone}
                onChange={(e) => setBookingForm({...bookingForm, telephone: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <Label htmlFor="nombrePersonnes">Nombre de personnes *</Label>
              <Input 
                id="nombrePersonnes"
                type="number"
                min="1"
                max="80"
                value={bookingForm.nombrePersonnes}
                onChange={(e) => setBookingForm({...bookingForm, nombrePersonnes: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <Label htmlFor="modePaiement">Mode de paiement</Label>
              <Select value={bookingForm.modePaiement} onValueChange={(value) => setBookingForm({...bookingForm, modePaiement: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1x">Paiement en 1 fois</SelectItem>
                  <SelectItem value="2x">Paiement en 2 fois</SelectItem>
                  <SelectItem value="3x">Paiement en 3 fois</SelectItem>
                  <SelectItem value="4x">Paiement en 4 fois</SelectItem>
                </SelectContent>
              </Select>
              <p className="form-hint">Le paiement sera disponible après validation des dates</p>
            </div>

            <Button data-testid="confirmer-reservation-btn" type="submit" className="submit-btn">
              CONFIRMER LA RÉSERVATION
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" />
    </div>
  );
};

// Proprietaire Component
const Proprietaire = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
      fetchDashboardData(token);
    }
    setLoading(false);
  };

  const fetchDashboardData = async (token) => {
    try {
      const [reservationsRes, statsRes] = await Promise.all([
        axios.get(`${API}/reservations`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setReservations(reservationsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        setIsAuthenticated(false);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/auth/login`, loginForm);
      localStorage.setItem('admin_token', response.data.access_token);
      setIsAuthenticated(true);
      fetchDashboardData(response.data.access_token);
      toast.success('Connexion réussie!');
    } catch (error) {
      toast.error('Identifiants incorrects');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    navigate('/');
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="proprietaire-login">
        <Card className="login-card">
          <CardHeader>
            <CardTitle>Espace Propriétaire</CardTitle>
            <CardDescription>Connectez-vous pour accéder au dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input 
                  id="username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <Label htmlFor="password">Mot de passe</Label>
                <Input 
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  required
                />
              </div>
              <Button data-testid="login-btn" type="submit" className="login-btn">
                SE CONNECTER
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="proprietaire-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Propriétaire</h1>
        <Button data-testid="logout-btn" variant="outline" onClick={handleLogout}>
          Déconnexion
        </Button>
      </div>

      {stats && (
        <div className="stats-grid">
          <Card>
            <CardHeader>
              <CardTitle>Total Réservations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="stat-value">{stats.total_reservations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Confirmées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="stat-value">{stats.confirmed_reservations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="stat-value">{stats.pending_reservations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Revenu total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="stat-value">{stats.total_revenue}€</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="reservations-table-card">
        <CardHeader>
          <CardTitle>Réservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="table-wrapper">
            <table className="reservations-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Formule</th>
                  <th>Dates</th>
                  <th>Personnes</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((res) => (
                  <tr key={res.id}>
                    <td>{res.nom_client}</td>
                    <td>{res.formule}</td>
                    <td>
                      {new Date(res.date_debut).toLocaleDateString()} - {new Date(res.date_fin).toLocaleDateString()}
                    </td>
                    <td>{res.nombre_personnes}</td>
                    <td>{res.montant_total}€</td>
                    <td>
                      <span className={`status-badge ${res.statut_paiement}`}>
                        {res.statut_paiement}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main App
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/proprietaire" element={<Proprietaire />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
