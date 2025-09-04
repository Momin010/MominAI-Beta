import { FileNode } from '../components/FileTree';

export interface ProjectTemplate {
  name: string;
  description: string;
  framework: 'react' | 'vue' | 'vanilla' | 'nextjs' | 'vite';
  files: ProjectFile[];
}

export interface ProjectFile {
  path: string;
  content: string;
  type: 'file' | 'folder';
}

export class ProjectManager {
  private basePath: string;

  constructor(basePath: string = '/projects') {
    this.basePath = basePath;
  }

  // Convert project files to FileNode structure for the file tree
  static filesToFileNodes(files: ProjectFile[]): FileNode[] {
    const buildTree = (paths: string[]): FileNode[] => {
      const tree: FileNode[] = [];
      const folders: { [key: string]: FileNode } = {};

      paths.forEach(path => {
        const parts = path.split('/');
        let currentPath = '';

        parts.forEach((part, index) => {
          currentPath += (currentPath ? '/' : '') + part;
          const isFile = index === parts.length - 1;

          if (!folders[currentPath]) {
            const node: FileNode = {
              name: part,
              path: currentPath,
              type: isFile ? 'file' : 'folder',
              children: isFile ? undefined : []
            };
            folders[currentPath] = node;

            if (index === 0) {
              tree.push(node);
            } else {
              const parentPath = parts.slice(0, index).join('/');
              const parent = folders[parentPath];
              if (parent && parent.children) {
                parent.children.push(node);
              }
            }
          }
        });
      });

      return tree;
    };

    const paths = files.map(file => file.path);
    return buildTree(paths);
  }

  // Generate project templates
  static getTemplates(): ProjectTemplate[] {
    return [
      {
        name: 'Car Dealership Website',
        description: 'Complete car dealership website with inventory, contact forms, and modern design',
        framework: 'nextjs',
        files: [
          {
            path: 'package.json',
            type: 'file',
            content: JSON.stringify({
              name: 'car-dealership-website',
              version: '0.1.0',
              private: true,
              scripts: {
                dev: 'next dev',
                build: 'next build',
                start: 'next start',
                lint: 'next lint'
              },
              dependencies: {
                next: '14.0.0',
                react: '^18',
                'react-dom': '^18',
                'framer-motion': '^10.16.0',
                'react-hot-toast': '^2.4.1',
                'lucide-react': '^0.294.0'
              },
              devDependencies: {
                typescript: '^5',
                '@types/node': '^20',
                '@types/react': '^18',
                '@types/react-dom': '^18',
                eslint: '^8',
                'eslint-config-next': '14.0.0',
                tailwindcss: '^3.3.0',
                autoprefixer: '^10.4.0',
                postcss: '^8.4.0'
              }
            }, null, 2)
          },
          {
            path: 'pages/index.tsx',
            type: 'file',
            content: `import Head from 'next/head'
import { motion } from 'framer-motion'
import Header from '../components/Header'
import Hero from '../components/Hero'
import Inventory from '../components/Inventory'
import Services from '../components/Services'
import Contact from '../components/Contact'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Head>
        <title>Premium Auto Dealership</title>
        <meta name="description" content="Your trusted car dealership for premium vehicles" />
      </Head>

      <Header />
      <Hero />
      <Inventory />
      <Services />
      <Contact />
      <Footer />
    </div>
  )
}`
          },
          {
            path: 'components/Header.tsx',
            type: 'file',
            content: `import { motion } from 'framer-motion'
import { Phone, Mail, MapPin, Menu } from 'lucide-react'

export default function Header() {
  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-black/80 backdrop-blur-xl border-b border-white/10"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold text-white"
          >
            Premium Auto
          </motion.div>

          <nav className="hidden md:flex space-x-8">
            <a href="#home" className="text-white/80 hover:text-white transition-colors">Home</a>
            <a href="#inventory" className="text-white/80 hover:text-white transition-colors">Inventory</a>
            <a href="#services" className="text-white/80 hover:text-white transition-colors">Services</a>
            <a href="#contact" className="text-white/80 hover:text-white transition-colors">Contact</a>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center space-x-4 text-sm text-white/70">
              <div className="flex items-center space-x-1">
                <Phone className="w-4 h-4" />
                <span>(555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-1">
                <Mail className="w-4 h-4" />
                <span>info@premiumauto.com</span>
              </div>
            </div>
            <button className="md:hidden">
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  )
}`
          },
          {
            path: 'components/Hero.tsx',
            type: 'file',
            content: `import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
      <div className="absolute inset-0 bg-black/40" />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative z-10 text-center text-white px-6"
      >
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
          Premium Auto Dealership
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-white/80 max-w-2xl mx-auto">
          Discover your dream car from our extensive collection of premium vehicles
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
        >
          View Inventory
        </motion.button>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <ChevronDown className="w-8 h-8 text-white/60" />
      </motion.div>
    </section>
  )
}`
          },
          {
            path: 'components/Inventory.tsx',
            type: 'file',
            content: `import { motion } from 'framer-motion'
import { Star, Fuel, Settings, Users } from 'lucide-react'

const cars = [
  {
    id: 1,
    name: 'BMW X5',
    price: '$65,000',
    image: '/api/placeholder/400/300',
    year: 2024,
    mileage: '5,000 miles',
    fuel: 'Gasoline',
    transmission: 'Automatic',
    seats: 5
  },
  {
    id: 2,
    name: 'Mercedes-Benz C-Class',
    price: '$55,000',
    image: '/api/placeholder/400/300',
    year: 2024,
    mileage: '3,200 miles',
    fuel: 'Gasoline',
    transmission: 'Automatic',
    seats: 5
  },
  {
    id: 3,
    name: 'Audi Q7',
    price: '$72,000',
    image: '/api/placeholder/400/300',
    year: 2024,
    mileage: '1,800 miles',
    fuel: 'Diesel',
    transmission: 'Automatic',
    seats: 7
  }
]

export default function Inventory() {
  return (
    <section id="inventory" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Inventory</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore our handpicked selection of premium vehicles
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cars.map((car, index) => (
            <motion.div
              key={car.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200"
            >
              <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-lg font-semibold">Car Image</span>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{car.name}</h3>
                  <span className="text-2xl font-bold text-blue-600">{car.price}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <Fuel className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{car.fuel}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{car.transmission}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{car.seats} seats</span>
                  </div>
                  <div className="text-sm text-gray-600">{car.year} • {car.mileage}</div>
                </div>

                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300">
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}`
          },
          {
            path: 'components/Services.tsx',
            type: 'file',
            content: `import { motion } from 'framer-motion'
import { Wrench, Shield, Car, CreditCard } from 'lucide-react'

const services = [
  {
    icon: Wrench,
    title: 'Maintenance & Repair',
    description: 'Professional maintenance and repair services for all vehicle makes and models'
  },
  {
    icon: Shield,
    title: 'Warranty Protection',
    description: 'Comprehensive warranty coverage to protect your investment'
  },
  {
    icon: Car,
    title: 'Trade-In Program',
    description: 'Get the best value for your current vehicle when trading in'
  },
  {
    icon: CreditCard,
    title: 'Financing Options',
    description: 'Flexible financing solutions to fit your budget and needs'
  }
]

export default function Services() {
  return (
    <section id="services" className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Complete automotive solutions from purchase to maintenance
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-2xl shadow-lg text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <service.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h3>
              <p className="text-gray-600">{service.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}`
          },
          {
            path: 'components/Contact.tsx',
            type: 'file',
            content: `import { motion } from 'framer-motion'
import { Phone, Mail, MapPin, Clock } from 'lucide-react'

export default function Contact() {
  return (
    <section id="contact" className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">Contact Us</h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Ready to find your perfect vehicle? Get in touch with our team today.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Phone</h3>
                <p className="text-white/80">(555) 123-4567</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Email</h3>
                <p className="text-white/80">info@premiumauto.com</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Location</h3>
                <p className="text-white/80">123 Auto Drive, City, State 12345</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Hours</h3>
                <p className="text-white/80">Mon-Fri: 9AM-8PM<br />Sat: 9AM-6PM<br />Sun: Closed</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl"
          >
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <input
                  type="text"
                  placeholder="First Name"
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>

              <input
                type="email"
                placeholder="Email Address"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />

              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />

              <textarea
                rows={4}
                placeholder="Tell us about the vehicle you're interested in..."
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
              />

              <button
                type="submit"
                className="w-full bg-white text-blue-600 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors duration-300"
              >
                Send Message
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  )
}`
          },
          {
            path: 'components/Footer.tsx',
            type: 'file',
            content: `import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-black text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">Premium Auto</h3>
            <p className="text-gray-400 mb-4">
              Your trusted partner for premium vehicles and exceptional service.
            </p>
            <div className="flex space-x-4">
              <Facebook className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Twitter className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Instagram className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Youtube className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#inventory" className="hover:text-white transition-colors">Inventory</a></li>
              <li><a href="#services" className="hover:text-white transition-colors">Services</a></li>
              <li><a href="#financing" className="hover:text-white transition-colors">Financing</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#maintenance" className="hover:text-white transition-colors">Maintenance</a></li>
              <li><a href="#repairs" className="hover:text-white transition-colors">Repairs</a></li>
              <li><a href="#warranty" className="hover:text-white transition-colors">Warranty</a></li>
              <li><a href="#trade-in" className="hover:text-white transition-colors">Trade-In</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
            <div className="space-y-2 text-gray-400">
              <p>123 Auto Drive</p>
              <p>City, State 12345</p>
              <p>(555) 123-4567</p>
              <p>info@premiumauto.com</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Premium Auto Dealership. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}`
          },
          {
            path: 'tailwind.config.js',
            type: 'file',
            content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}`
          },
          {
            path: 'postcss.config.js',
            type: 'file',
            content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
          },
          {
            path: 'styles/globals.css',
            type: 'file',
            content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}`
          }
        ]
      },
      {
        name: 'E-commerce Site',
        description: 'Full e-commerce platform with products, cart, checkout, and admin panel',
        framework: 'nextjs',
        files: [
          {
            path: 'package.json',
            type: 'file',
            content: JSON.stringify({
              name: 'ecommerce-site',
              version: '0.1.0',
              private: true,
              scripts: {
                dev: 'next dev',
                build: 'next build',
                start: 'next start',
                lint: 'next lint'
              },
              dependencies: {
                next: '14.0.0',
                react: '^18',
                'react-dom': '^18',
                'framer-motion': '^10.16.0',
                'react-hot-toast': '^2.4.1',
                'lucide-react': '^0.294.0',
                'react-use-cart': '^1.13.0',
                stripe: '^13.0.0'
              },
              devDependencies: {
                typescript: '^5',
                '@types/node': '^20',
                '@types/react': '^18',
                '@types/react-dom': '^18',
                eslint: '^8',
                'eslint-config-next': '14.0.0',
                tailwindcss: '^3.3.0',
                autoprefixer: '^10.4.0',
                postcss: '^8.4.0'
              }
            }, null, 2)
          },
          {
            path: 'pages/index.tsx',
            type: 'file',
            content: `import Head from 'next/head'
import Header from '../components/Header'
import Hero from '../components/Hero'
import FeaturedProducts from '../components/FeaturedProducts'
import Categories from '../components/Categories'
import Newsletter from '../components/Newsletter'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>ShopHub - Your Online Store</title>
        <meta name="description" content="Discover amazing products at great prices" />
      </Head>

      <Header />
      <Hero />
      <Categories />
      <FeaturedProducts />
      <Newsletter />
      <Footer />
    </div>
  )
}`
          },
          {
            path: 'components/Header.tsx',
            type: 'file',
            content: `import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Search, User, Menu, X } from 'lucide-react'
import Link from 'next/link'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            ShopHub
          </Link>

          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors">Home</Link>
            <Link href="/products" className="text-gray-700 hover:text-blue-600 transition-colors">Products</Link>
            <Link href="/categories" className="text-gray-700 hover:text-blue-600 transition-colors">Categories</Link>
            <Link href="/about" className="text-gray-700 hover:text-blue-600 transition-colors">About</Link>
            <Link href="/contact" className="text-gray-700 hover:text-blue-600 transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>

            <Link href="/cart" className="relative">
              <ShoppingCart className="w-6 h-6 text-gray-700" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            </Link>

            <Link href="/account">
              <User className="w-6 h-6 text-gray-700" />
            </Link>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden mt-4 pb-4 border-t pt-4"
          >
            <nav className="flex flex-col space-y-4">
              <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors">Home</Link>
              <Link href="/products" className="text-gray-700 hover:text-blue-600 transition-colors">Products</Link>
              <Link href="/categories" className="text-gray-700 hover:text-blue-600 transition-colors">Categories</Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600 transition-colors">About</Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600 transition-colors">Contact</Link>
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  )
}`
          },
          {
            path: 'components/Hero.tsx',
            type: 'file',
            content: `import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl font-bold mb-6">
              Discover Amazing Products
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Shop the latest trends and find everything you need at unbeatable prices.
              Free shipping on orders over $50.
            </p>
            <div className="flex space-x-4">
              <Link
                href="/products"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Shop Now
              </Link>
              <Link
                href="/categories"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                Browse Categories
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <div className="text-6xl mb-4">🛍️</div>
              <h3 className="text-2xl font-bold mb-2">Premium Quality</h3>
              <p className="text-blue-100">Curated products from trusted brands</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}`
          },
          {
            path: 'components/FeaturedProducts.tsx',
            type: 'file',
            content: `import { motion } from 'framer-motion'
import { Star, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

const products = [
  {
    id: 1,
    name: 'Wireless Headphones',
    price: 199.99,
    originalPrice: 249.99,
    rating: 4.5,
    image: '/api/placeholder/300/300',
    category: 'Electronics'
  },
  {
    id: 2,
    name: 'Smart Watch',
    price: 299.99,
    originalPrice: 349.99,
    rating: 4.8,
    image: '/api/placeholder/300/300',
    category: 'Wearables'
  },
  {
    id: 3,
    name: 'Laptop Stand',
    price: 49.99,
    originalPrice: 69.99,
    rating: 4.2,
    image: '/api/placeholder/300/300',
    category: 'Accessories'
  },
  {
    id: 4,
    name: 'Bluetooth Speaker',
    price: 79.99,
    originalPrice: 99.99,
    rating: 4.6,
    image: '/api/placeholder/300/300',
    category: 'Audio'
  }
]

export default function FeaturedProducts() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Products</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover our most popular items with great discounts
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="h-48 bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400">Product Image</span>
              </div>

              <div className="p-6">
                <div className="text-sm text-blue-600 font-medium mb-2">{product.category}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>

                <div className="flex items-center mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={\`w-4 h-4 \${
                          i < Math.floor(product.rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }\`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 ml-2">({product.rating})</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">\${product.price}</span>
                    <span className="text-sm text-gray-500 line-through ml-2">\${product.originalPrice}</span>
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    Save \${(product.originalPrice - product.price).toFixed(2)}
                  </div>
                </div>

                <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/products"
            className="bg-gray-900 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  )
}`
          },
          {
            path: 'components/Categories.tsx',
            type: 'file',
            content: `import { motion } from 'framer-motion'
import Link from 'next/link'

const categories = [
  {
    name: 'Electronics',
    icon: '📱',
    count: 245,
    color: 'from-blue-500 to-blue-600'
  },
  {
    name: 'Fashion',
    icon: '👕',
    count: 189,
    color: 'from-pink-500 to-pink-600'
  },
  {
    name: 'Home & Garden',
    icon: '🏠',
    count: 156,
    color: 'from-green-500 to-green-600'
  },
  {
    name: 'Sports',
    icon: '⚽',
    count: 98,
    color: 'from-orange-500 to-orange-600'
  },
  {
    name: 'Books',
    icon: '📚',
    count: 312,
    color: 'from-purple-500 to-purple-600'
  },
  {
    name: 'Beauty',
    icon: '💄',
    count: 167,
    color: 'from-red-500 to-red-600'
  }
]

export default function Categories() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Shop by Category</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find exactly what you're looking for in our diverse product categories
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Link href={\`/categories/\${category.name.toLowerCase()}\`}>
                <div className={\`bg-gradient-to-r \${category.color} rounded-2xl p-8 text-white text-center cursor-pointer hover:shadow-lg transition-all duration-300\`}>
                  <div className="text-6xl mb-4">{category.icon}</div>
                  <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
                  <p className="text-white/80">{category.count} products</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}`
          },
          {
            path: 'components/Newsletter.tsx',
            type: 'file',
            content: `import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'

export default function Newsletter() {
  return (
    <section className="py-20 bg-gradient-to-r from-gray-900 to-black text-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          <Mail className="w-16 h-16 mx-auto mb-6 text-blue-400" />
          <h2 className="text-4xl font-bold mb-4">Stay Updated</h2>
          <p className="text-xl text-gray-300 mb-8">
            Subscribe to our newsletter and get exclusive deals, new product alerts, and special offers delivered to your inbox.
          </p>

          <div className="max-w-md mx-auto">
            <div className="flex">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-l-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-r-lg font-semibold transition-colors">
                Subscribe
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}`
          },
          {
            path: 'components/Footer.tsx',
            type: 'file',
            content: `import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">ShopHub</h3>
            <p className="text-gray-400 mb-4">
              Your one-stop destination for quality products and exceptional shopping experience.
            </p>
            <div className="flex space-x-4">
              <Facebook className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Twitter className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Instagram className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Youtube className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping Info</Link></li>
              <li><Link href="/returns" className="hover:text-white transition-colors">Returns</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
              <li><Link href="/size-guide" className="hover:text-white transition-colors">Size Guide</Link></li>
              <li><Link href="/track-order" className="hover:text-white transition-colors">Track Order</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
            <div className="space-y-2 text-gray-400">
              <p>123 Commerce Street</p>
              <p>Business City, BC 12345</p>
              <p>(555) 123-4567</p>
              <p>support@shophub.com</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 ShopHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}`
          },
          {
            path: 'tailwind.config.js',
            type: 'file',
            content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}`
          },
          {
            path: 'styles/globals.css',
            type: 'file',
            content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}`
          }
        ]
      },
      {
        name: 'React Auth App',
        description: 'React application with user authentication, protected routes, and user management',
        framework: 'nextjs',
        files: [
          {
            path: 'package.json',
            type: 'file',
            content: JSON.stringify({
              name: 'react-auth-app',
              version: '0.1.0',
              private: true,
              scripts: {
                dev: 'next dev',
                build: 'next build',
                start: 'next start',
                lint: 'next lint'
              },
              dependencies: {
                next: '14.0.0',
                react: '^18',
                'react-dom': '^18',
                'framer-motion': '^10.16.0',
                'react-hot-toast': '^2.4.1',
                'lucide-react': '^0.294.0',
                'next-auth': '^4.24.0',
                'bcryptjs': '^2.4.3',
                'jsonwebtoken': '^9.0.0'
              },
              devDependencies: {
                typescript: '^5',
                '@types/node': '^20',
                '@types/react': '^18',
                '@types/react-dom': '^18',
                '@types/bcryptjs': '^2.4.0',
                '@types/jsonwebtoken': '^9.0.0',
                eslint: '^8',
                'eslint-config-next': '14.0.0',
                tailwindcss: '^3.3.0',
                autoprefixer: '^10.4.0',
                postcss: '^8.4.0'
              }
            }, null, 2)
          },
          {
            path: 'pages/index.tsx',
            type: 'file',
            content: `import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Dashboard from '../components/Dashboard'
import Landing from '../components/Landing'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (session) {
    return <Dashboard />
  }

  return <Landing />
}`
          },
          {
            path: 'pages/api/auth/[...nextauth].ts',
            type: 'file',
            content: `import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const users = [
  {
    id: '1',
    email: 'user@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    name: 'John Doe',
    role: 'user'
  }
]

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = users.find(u => u.email === credentials.email)

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub
        session.user.role = token.role
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup'
  }
})`
          },
          {
            path: 'pages/auth/signin.tsx',
            type: 'file',
            content: `import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        toast.error('Invalid credentials')
      } else {
        toast.success('Signed in successfully!')
        router.push('/')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}`
          },
          {
            path: 'components/Dashboard.tsx',
            type: 'file',
            content: `import { useSession, signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import { User, Settings, LogOut } from 'lucide-react'

export default function Dashboard() {
  const { data: session } = useSession()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-700">{session?.user?.name}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Welcome back, {session?.user?.name}!
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Profile</h4>
                  <p className="text-blue-600">Manage your account settings</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Activity</h4>
                  <p className="text-green-600">View your recent activity</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">Settings</h4>
                  <p className="text-purple-600">Configure your preferences</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}`
          },
          {
            path: 'components/Landing.tsx',
            type: 'file',
            content: `import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Shield, Zap, Users } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10">
          <header className="container mx-auto px-6 py-8">
            <nav className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">AuthApp</h1>
              <div className="space-x-4">
                <Link
                  href="/auth/signin"
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </nav>
          </header>

          <main className="container mx-auto px-6 py-20">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center text-white"
            >
              <h1 className="text-6xl font-bold mb-6">
                Secure Authentication
                <br />
                <span className="text-blue-200">Made Simple</span>
              </h1>
              <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
                Build secure applications with our comprehensive authentication system.
                User management, protected routes, and more.
              </p>
              <div className="flex justify-center space-x-4">
                <Link
                  href="/auth/signup"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center space-x-2"
                >
                  <span>Start Building</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-20 grid md:grid-cols-3 gap-8"
            >
              <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl text-center">
                <Shield className="w-12 h-12 text-blue-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Secure</h3>
                <p className="text-blue-100">Industry-standard security with JWT tokens</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl text-center">
                <Zap className="w-12 h-12 text-yellow-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Fast</h3>
                <p className="text-blue-100">Lightning-fast authentication and session management</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl text-center">
                <Users className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Scalable</h3>
                <p className="text-blue-100">Built to handle thousands of users seamlessly</p>
              </div>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  )
}`
          },
          {
            path: 'pages/_app.tsx',
            type: 'file',
            content: `import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </SessionProvider>
  )
}`
          },
          {
            path: 'tailwind.config.js',
            type: 'file',
            content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`
          },
          {
            path: 'styles/globals.css',
            type: 'file',
            content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}`
          }
        ]
      },
      {
        name: 'React + Vite',
        description: 'Modern React application with Vite',
        framework: 'vite',
        files: [
          {
            path: 'package.json',
            type: 'file',
            content: JSON.stringify({
              name: 'react-vite-app',
              version: '0.1.0',
              type: 'module',
              scripts: {
                dev: 'vite',
                build: 'vite build',
                preview: 'vite preview'
              },
              dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0'
              },
              devDependencies: {
                '@types/react': '^18.2.0',
                '@types/react-dom': '^18.2.0',
                '@vitejs/plugin-react': '^4.0.0',
                vite: '^4.3.0',
                typescript: '^5.0.0'
              }
            }, null, 2)
          },
          {
            path: 'vite.config.ts',
            type: 'file',
            content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
          },
          {
            path: 'index.html',
            type: 'file',
            content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React + Vite App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
          },
          {
            path: 'src/main.tsx',
            type: 'file',
            content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
          },
          {
            path: 'src/App.tsx',
            type: 'file',
            content: `import React from 'react'
import './App.css'

function App() {
  return (
    <div className="App">
      <h1>Hello React + Vite!</h1>
      <p>Start building your amazing app.</p>
    </div>
  )
}

export default App`
          },
          {
            path: 'src/App.css',
            type: 'file',
            content: `.App {
  text-align: center;
  padding: 2rem;
}

h1 {
  color: #646cff;
}`
          },
          {
            path: 'src/index.css',
            type: 'file',
            content: `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}`
          }
        ]
      },
      {
        name: 'Vue + Vite',
        description: 'Modern Vue.js application with Vite',
        framework: 'vite',
        files: [
          {
            path: 'package.json',
            type: 'file',
            content: JSON.stringify({
              name: 'vue-vite-app',
              version: '0.1.0',
              type: 'module',
              scripts: {
                dev: 'vite',
                build: 'vite build',
                preview: 'vite preview'
              },
              dependencies: {
                vue: '^3.3.0'
              },
              devDependencies: {
                '@vitejs/plugin-vue': '^4.2.0',
                vite: '^4.3.0',
                typescript: '^5.0.0',
                'vue-tsc': '^1.6.0'
              }
            }, null, 2)
          },
          {
            path: 'vite.config.ts',
            type: 'file',
            content: `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})`
          },
          {
            path: 'index.html',
            type: 'file',
            content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vue + Vite App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`
          },
          {
            path: 'src/main.ts',
            type: 'file',
            content: `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')`
          },
          {
            path: 'src/App.vue',
            type: 'file',
            content: `<template>
  <div id="app">
    <h1>Hello Vue + Vite!</h1>
    <p>Start building your amazing app.</p>
  </div>
</template>

<script setup lang="ts">
// Add your Vue.js logic here
</script>

<style scoped>
#app {
  text-align: center;
  padding: 2rem;
}

h1 {
  color: #646cff;
}
</style>`
          }
        ]
      },
      {
        name: 'Next.js App',
        description: 'Full-stack Next.js application',
        framework: 'nextjs',
        files: [
          {
            path: 'package.json',
            type: 'file',
            content: JSON.stringify({
              name: 'nextjs-app',
              version: '0.1.0',
              private: true,
              scripts: {
                dev: 'next dev',
                build: 'next build',
                start: 'next start',
                lint: 'next lint'
              },
              dependencies: {
                next: '14.0.0',
                react: '^18',
                'react-dom': '^18'
              },
              devDependencies: {
                typescript: '^5',
                '@types/node': '^20',
                '@types/react': '^18',
                '@types/react-dom': '^18',
                eslint: '^8',
                'eslint-config-next': '14.0.0'
              }
            }, null, 2)
          },
          {
            path: 'pages/index.tsx',
            type: 'file',
            content: `import Head from 'next/head'

export default function Home() {
  return (
    <div>
      <Head>
        <title>Next.js App</title>
      </Head>
      <main>
        <h1>Hello Next.js!</h1>
        <p>Start building your amazing app.</p>
      </main>
    </div>
  )
}`
          },
          {
            path: 'pages/api/hello.ts',
            type: 'file',
            content: `import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ message: 'Hello from Next.js API!' })
}`
          }
        ]
      }
    ];
  }

  // Create a new project from template
  static async createProject(template: ProjectTemplate, projectName: string): Promise<ProjectFile[]> {
    // In a real implementation, this would create actual files on the server
    // For now, we'll just return the template files with the project name
    return template.files.map(file => ({
      ...file,
      path: file.path.replace(/^/, `${projectName}/`)
    }));
  }
}