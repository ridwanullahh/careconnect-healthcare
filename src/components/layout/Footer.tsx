// Footer Component for CareConnect Healthcare Platform
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Stethoscope,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [openSection, setOpenSection] = useState<number>(0); // First section open by default on mobile

  const toggleSection = (index: number) => {
    setOpenSection(openSection === index ? -1 : index);
  };

  const footerSections = [
    {
      title: 'Healthcare Services',
      links: [
        { name: 'Find Providers', href: '/directory' },
        { name: 'Book Appointments', href: '/directory?book=true' },
        { name: 'Telehealth', href: '/directory?type=telehealth' },
        { name: 'Emergency Care', href: '/directory?category=emergency' },
        { name: 'Pharmacy Services', href: '/directory?type=pharmacy' }
      ]
    },
    {
      title: 'Health & Wellness',
      links: [
        { name: 'Health Tools', href: '/health-tools' },
        { name: 'AI Health Assistant', href: '/health-tools?category=ai' },
        { name: 'Health Calculators', href: '/health-tools?category=calculators' },
        { name: 'Weekly Health Tips', href: '/weekly-tips' },
        { name: 'Timeless Health Facts', href: '/timeless-facts' }
      ]
    },
    {
      title: 'Learning & Growth',
      links: [
        { name: 'Online Courses', href: '/courses' },
        { name: 'Health Blog', href: '/blog' },
        { name: 'HealthTalk Podcast', href: '/health-talk-podcast' },
        { name: 'Health News', href: '/health-news-feed' },
        { name: 'Medical Training', href: '/courses?category=medical' }
      ]
    },
    {
      title: 'Career Opportunities',
      links: [
        { name: 'Browse Jobs', href: '/jobs' },
        { name: 'Nursing Jobs', href: '/jobs?category=nursing' },
        { name: 'Doctor Positions', href: '/jobs?category=medical-doctors' },
        { name: 'Remote Jobs', href: '/jobs?location=remote' },
        { name: 'Post a Job', href: '/admin/jobs' }
      ]
    },
    {
      title: 'Community Impact',
      links: [
        { name: 'Q&A Forum', href: '/community' },
        { name: 'Ask a Question', href: '/community/new' },
        { name: 'Healthcare Causes', href: '/causes' },
        { name: 'Community Health', href: '/causes?category=community' },
        { name: 'Volunteer Opportunities', href: '/causes?type=volunteer' }
      ]
    },
    {
      title: 'For Providers',
      links: [
        { name: 'Join Network', href: '/register?type=provider' },
        { name: 'Provider Dashboard', href: '/admin' },
        { name: 'Practice Management', href: '/admin/practice' },
        { name: 'Telehealth Setup', href: '/admin/telehealth' },
        { name: 'Marketing Tools', href: '/admin/marketing' }
      ]
    },
    {
      title: 'Support & Resources',
      links: [
        { name: 'Help Center', href: '/help' },
        { name: 'Contact Support', href: '/contact' },
        { name: 'API Documentation', href: '/developers' },
        { name: 'System Status', href: '/status' },
        { name: 'Security', href: '/security' }
      ]
    }
  ];

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'HIPAA Compliance', href: '/hipaa' },
    { name: 'Accessibility', href: '/accessibility' },
    { name: 'Cookie Policy', href: '/cookies' }
  ];

  const socialLinks = [
    { name: 'Facebook', href: '#', icon: Facebook },
    { name: 'Twitter', href: '#', icon: Twitter },
    { name: 'Instagram', href: '#', icon: Instagram },
    { name: 'LinkedIn', href: '#', icon: Linkedin }
  ];

  return (
    <footer className="bg-surface dark:bg-dark text-text transition-colors duration-300 border-t border-border">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        {/* Brand Section */}
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">CareConnect</h3>
              <p className="text-text-secondary text-sm">Healthcare Platform</p>
            </div>
          </div>
          
          <p className="text-text-secondary max-w-md mb-6">
            Connecting patients with quality healthcare providers, empowering wellness through 
            technology, and building healthier communities together.
          </p>
          
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-accent" />
              <span className="text-sm text-text-secondary">1-800-CARE-CONNECT</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-accent" />
              <span className="text-sm text-text-secondary">support@careconnect.com</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="text-sm text-text-secondary">Available Nationwide</span>
            </div>
          </div>
          
          {/* Social Links */}
          <div className="flex space-x-4">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.href}
                  className="w-10 h-10 bg-white dark:bg-surface rounded-lg flex items-center justify-center hover:bg-primary transition-colors text-text-secondary hover:text-white"
                  aria-label={social.name}
                >
                  <Icon className="w-5 h-5" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Footer Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-8">
          {footerSections.map((section, index) => (
            <div key={section.title}>
              {/* Desktop View */}
              <div className="hidden md:block">
                <h4 className="text-text font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="text-sm text-text-secondary hover:text-primary transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mobile Accordion View */}
              <div className="md:hidden">
                <button
                  onClick={() => toggleSection(index)}
                  className="w-full flex items-center justify-between py-3 text-text font-semibold border-b border-border"
                >
                  <span>{section.title}</span>
                  {openSection === index ? (
                    <ChevronUp className="w-5 h-5 text-text-secondary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-text-secondary" />
                  )}
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${
                  openSection === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <ul className="space-y-2 pt-3 pb-4">
                    {section.links.map((link) => (
                      <li key={link.name}>
                        <Link
                          to={link.href}
                          className="block text-sm text-text-secondary hover:text-primary transition-colors py-1"
                        >
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-sm text-text-secondary opacity-75">
              © {currentYear} CareConnect Healthcare Platform. All rights reserved.
            </div>
            
            {/* Legal Links */}
            <div className="flex flex-wrap justify-center md:justify-end space-x-6">
              {legalLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-sm text-text-secondary opacity-75 hover:text-primary transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          
          {/* Medical Disclaimer */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-text-secondary opacity-70 text-center max-w-4xl mx-auto">
              <strong>Medical Disclaimer:</strong> The information provided on CareConnect is for 
              informational purposes only and is not intended as a substitute for professional 
              medical advice, diagnosis, or treatment. Always seek the advice of your physician 
              or other qualified health provider with any questions you may have regarding a 
              medical condition. Never disregard professional medical advice or delay in seeking 
              it because of something you have read on this platform.
            </p>
          </div>
          
          {/* Compliance Badges */}
          <div className="mt-4 flex flex-wrap justify-center items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
                <Heart className="w-4 h-4 text-dark" />
              </div>
              <span className="text-xs text-text-secondary opacity-70">HIPAA Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-dark" />
              </div>
              <span className="text-xs text-text-secondary opacity-70">Healthcare Verified</span>
            </div>
            <div className="text-xs text-text-secondary opacity-70">SSL Secured</div>
            <div className="text-xs text-text-secondary opacity-70">SOC 2 Compliant</div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
