import React, { useState, useMemo } from 'react'
import {
  FaSearch,
  FaShoppingCart,
  FaUser,
  FaHeart,
  FaRobot,
  FaStar,
  FaTruck,
  FaLeaf,
  FaShieldAlt,
  FaArrowRight,
  FaTimes
} from 'react-icons/fa'
import ChatWidget from './ChatWidget'

// Real catalog data matching MongoDB Atlas inventory
const PRODUCTS = [
  {
    item_id: 'FURN-SOF-001',
    name: 'Aurelia Velvet 3-Seater Sofa',
    brand: 'LuxeLiving',
    category: 'Living Room',
    badge: 'Best Seller',
    rating: 4.9,
    reviewsCount: 142,
    fullPrice: 1299.99,
    salePrice: 1099.99,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    description: 'Sumptuous jewel-toned velvet with high-density pocket coils and brushed champagne brass tapered legs.'
  },
  {
    item_id: 'FURN-TBL-002',
    name: 'Ridgefield Reclaimed Oak Dining Table',
    brand: 'Timber & Forge',
    category: 'Dining Room',
    badge: 'Artisan Crafted',
    rating: 4.8,
    reviewsCount: 89,
    fullPrice: 1450.00,
    salePrice: 1450.00,
    image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80',
    description: 'Solid heritage French oak with hand-planed edges, organic oil finish, and seats up to 8 guests comfortably.'
  },
  {
    item_id: 'FURN-CHR-003',
    name: 'ErgoPro Dynamic Task Chair',
    brand: 'WorkForm',
    category: 'Office',
    badge: 'Ergonomic Top Pick',
    rating: 4.9,
    reviewsCount: 310,
    fullPrice: 489.00,
    salePrice: 399.50,
    image: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=800&q=80',
    description: 'Breathable composite mesh, 4D adjustable armrests, adaptive pneumatic lumbar, and BIFMA certification.'
  },
  {
    item_id: 'FURN-BED-004',
    name: 'Kyoto Low-Profile Platform Bed',
    brand: 'Zenith Home',
    category: 'Bedroom',
    badge: 'Japandi Minimalist',
    rating: 4.9,
    reviewsCount: 95,
    fullPrice: 1150.00,
    salePrice: 999.00,
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
    description: 'Solid ash hardwood joinery with integrated floating nightstands and heavy-duty Birch acoustic slats.'
  },
  {
    item_id: 'FURN-BKS-005',
    name: 'Ironworks 5-Tier Etagere Bookcase',
    brand: 'Urban Loft Co.',
    category: 'Living Room',
    badge: 'Modern Industrial',
    rating: 4.7,
    reviewsCount: 78,
    fullPrice: 520.00,
    salePrice: 445.00,
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
    description: 'Matte black structural steel frame with warm kiln-dried pine shelves. Anti-tip anchor kit included.'
  },
  {
    item_id: 'FURN-PAT-006',
    name: 'Solstice 4-Piece Outdoor Conversation Set',
    brand: 'BreezeHaven',
    category: 'Outdoor',
    badge: 'Weather Resistant',
    rating: 4.8,
    reviewsCount: 64,
    fullPrice: 1899.99,
    salePrice: 1599.99,
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
    description: 'Grade-A Indonesian teak with Sunbrella® stain-resistant, UV-proof cushions and a matching coffee table.'
  },
  {
    item_id: 'FURN-ARM-007',
    name: 'Malmo Bouclé Accent Chair',
    brand: 'Nordic Nest Design',
    category: 'Living Room',
    badge: 'Trending Design',
    rating: 4.9,
    reviewsCount: 184,
    fullPrice: 649.00,
    salePrice: 579.00,
    image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
    description: 'Curved architectural barrel silhouette wrapped in heavyweight cream bouclé with a hidden 360° brass swivel.'
  },
  {
    item_id: 'FURN-COF-008',
    name: 'Verona Carrara Marble Coffee Table',
    brand: 'Atelier Modern',
    category: 'Living Room',
    badge: 'Luxury Stone',
    rating: 4.8,
    reviewsCount: 112,
    fullPrice: 890.00,
    salePrice: 799.00,
    image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80',
    description: 'Honest Italian Carrara marble slab with subtle grey veining and an organic chamfered edge.'
  }
]

const CATEGORIES = ['All', 'Living Room', 'Dining Room', 'Office', 'Bedroom', 'Outdoor']

const EcommerceStore = () => {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('featured')
  const [wishlist, setWishlist] = useState(['FURN-SOF-001', 'FURN-ARM-007'])
  const [cartItems, setCartItems] = useState([
    { id: 'FURN-SOF-001', qty: 1 }
  ])
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3200)
  }

  const toggleWishlist = (id, name) => {
    if (wishlist.includes(id)) {
      setWishlist(prev => prev.filter(item => item !== id))
      showToast(`Removed "${name}" from Wishlist`)
    } else {
      setWishlist(prev => [...prev, id])
      showToast(`Added "${name}" to Wishlist ❤️`)
    }
  }

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.item_id)
      if (existing) {
        return prev.map(item => item.id === product.item_id ? { ...item, qty: item.qty + 1 } : item)
      }
      return [...prev, { id: product.item_id, qty: 1 }]
    })
    showToast(`Added "${product.name}" to Cart 🛍️`)
  }

  const askAiAboutProduct = (product) => {
    const query = `Tell me all details about the ${product.name} (${product.brand}), its dimensions, materials, and styling suggestions.`
    const event = new CustomEvent('open-chat-with-query', { detail: { query } })
    window.dispatchEvent(event)
  }

  const openGeneralChat = (initialPrompt) => {
    const event = new CustomEvent('open-chat-with-query', { detail: { query: initialPrompt } })
    window.dispatchEvent(event)
  }

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let list = [...PRODUCTS]

    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    }

    if (sortBy === 'price-low') {
      list.sort((a, b) => a.salePrice - b.salePrice)
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.salePrice - a.salePrice)
    } else if (sortBy === 'discount') {
      list.sort((a, b) => (b.fullPrice - b.salePrice) - (a.fullPrice - a.salePrice))
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating)
    }

    return list
  }, [selectedCategory, searchQuery, sortBy])

  const totalCartCount = cartItems.reduce((acc, curr) => acc + curr.qty, 0)

  return (
    <div className="store-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)}><FaTimes size={12} /></button>
        </div>
      )}

      {/* Top Announcement Bar */}
      <div className="announcement-bar">
        <div className="container announcement-content">
          <span>✨ <strong>Private Sale:</strong> Enjoy up to 25% off signature furniture • White-glove delivery included</span>
          <div className="announcement-links">
            <span onClick={() => openGeneralChat("Can you check current furniture promotions and warranty?")} className="announcement-cta">
              Ask AI Concierge →
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="header">
        <div className="container">
          <div className="top-bar">
            {/* Logo */}
            <div className="logo-section">
              <a href="#" className="logo">
                <span className="logo-mark">SS</span>
                <span className="logo-text">SHOPSMART</span>
              </a>
              <span className="logo-tagline">Architectural Living</span>
            </div>

            {/* Search Bar */}
            <div className="search-bar">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search sofas, oak tables, bouclé chairs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>
                  <FaTimes size={12} />
                </button>
              )}
            </div>

            {/* Nav Icons */}
            <div className="nav-icons">
              <button
                className="ai-concierge-nav-btn"
                onClick={() => openGeneralChat("What are your most popular design recommendations today?")}
                title="Open AI Concierge"
              >
                <FaRobot size={15} />
                <span>AI Concierge</span>
              </button>

              <a href="#account" className="icon-link" title="My Account">
                <FaUser size={18} />
              </a>

              <a href="#wishlist" className="icon-link" title="Wishlist">
                <FaHeart size={18} />
                {wishlist.length > 0 && <span className="badge">{wishlist.length}</span>}
              </a>

              <a href="#cart" className="icon-link" title="Shopping Cart">
                <FaShoppingCart size={18} />
                {totalCartCount > 0 && <span className="badge">{totalCartCount}</span>}
              </a>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="nav-bar">
            <ul>
              {CATEGORIES.map(cat => (
                <li key={cat}>
                  <button
                    className={`nav-tab-btn ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(cat)
                      setSearchQuery('')
                    }}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Luxury Hero Section */}
        <section className="hero-section">
          <div className="hero-backdrop"></div>
          <div className="container hero-container">
            <div className="hero-content">
              <div className="hero-pill-badge">
                <span>NEW 2026 ARCHITECTURAL COLLECTION</span>
              </div>
              <h1>Curated Living, Timeless Craftsmanship.</h1>
              <p>
                Sculptural silhouettes, sustainably harvested hardwoods, and tailored Italian upholstery.
                Discover pieces engineered to anchor modern interiors for decades.
              </p>
              <div className="hero-actions">
                <a href="#catalog" className="btn-primary">
                  Explore Collection <FaArrowRight size={13} />
                </a>
                <button
                  className="btn-secondary"
                  onClick={() => openGeneralChat("Help me choose the right furniture for a warm, minimalist modern living room.")}
                >
                  <FaRobot size={16} /> Consult AI Assistant
                </button>
              </div>

              {/* Metrics */}
              <div className="hero-metrics">
                <div className="metric-item">
                  <strong>4.9 / 5</strong>
                  <span>Over 12,000 Verified Reviews</span>
                </div>
                <div className="metric-divider"></div>
                <div className="metric-item">
                  <strong>100% Solid</strong>
                  <span>Sustainably Harvested Timber</span>
                </div>
                <div className="metric-divider"></div>
                <div className="metric-item">
                  <strong>30 Days</strong>
                  <span>Risk-Free In-Home Trial</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Proposition Highlights */}
        <section className="features-section">
          <div className="container">
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <FaTruck />
                </div>
                <div>
                  <h4>White-Glove Delivery</h4>
                  <p>In-room delivery, unpacking, and packaging removal on all large orders.</p>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <FaLeaf />
                </div>
                <div>
                  <h4>FSC® Certified Hardwoods</h4>
                  <p>Ethically sourced European oak, American walnut, and kiln-dried timber.</p>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <FaShieldAlt />
                </div>
                <div>
                  <h4>10-Year Craft Guarantee</h4>
                  <p>Engineered joinery tested for commercial longevity and home durability.</p>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <FaRobot />
                </div>
                <div>
                  <h4>24/7 AI Interior Concierge</h4>
                  <p>Instant answers on dimensions, color palettes, and stock availability.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Catalog Section */}
        <section className="catalog-section" id="catalog">
          <div className="container">
            {/* Catalog Controls Header */}
            <div className="catalog-header">
              <div>
                <span className="section-eyebrow">THE SHOWROOM</span>
                <h2 className="section-title">
                  {selectedCategory === 'All' ? 'Signature Furniture Pieces' : `${selectedCategory} Collection`}
                </h2>
                <p className="section-subtitle">
                  Showing {filteredProducts.length} handcrafted {filteredProducts.length === 1 ? 'item' : 'items'} in stock
                </p>
              </div>

              {/* Filter / Sort bar */}
              <div className="catalog-controls">
                <div className="sort-group">
                  <label htmlFor="sort-select">Sort by:</label>
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="sort-dropdown"
                  >
                    <option value="featured">Featured & Best Matches</option>
                    <option value="rating">Highest Rated</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="discount">Biggest Savings</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="no-results-card">
                <p>No furniture items found matching "{searchQuery}".</p>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('All')
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="products-grid">
                {filteredProducts.map(product => {
                  const isWishlisted = wishlist.includes(product.item_id)
                  const hasDiscount = product.salePrice < product.fullPrice
                  const discountPercent = hasDiscount
                    ? Math.round(((product.fullPrice - product.salePrice) / product.fullPrice) * 100)
                    : 0

                  return (
                    <div key={product.item_id} className="product-card">
                      {/* Image Container */}
                      <div className="product-card-image-box">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="product-card-thumb"
                          loading="lazy"
                        />
                        <div className="product-badges">
                          {product.badge && <span className="badge-tag badge-dark">{product.badge}</span>}
                          {hasDiscount && (
                            <span className="badge-tag badge-sale">Save {discountPercent}%</span>
                          )}
                        </div>
                        <button
                          className={`wishlist-button ${isWishlisted ? 'active' : ''}`}
                          onClick={() => toggleWishlist(product.item_id, product.name)}
                          title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
                        >
                          <FaHeart size={15} />
                        </button>
                      </div>

                      {/* Card Content */}
                      <div className="product-card-body">
                        <div className="product-card-meta">
                          <span className="product-brand">{product.brand}</span>
                          <span className="product-category-tag">{product.category}</span>
                        </div>

                        <h3 className="product-name">{product.name}</h3>
                        <p className="product-desc">{product.description}</p>

                        {/* Rating */}
                        <div className="product-rating">
                          <div className="stars">
                            {[...Array(5)].map((_, i) => (
                              <FaStar key={i} className="star-icon" size={12} />
                            ))}
                          </div>
                          <span className="rating-score">{product.rating}</span>
                          <span className="reviews-count">({product.reviewsCount})</span>
                        </div>

                        {/* Price */}
                        <div className="product-price-row">
                          <div className="price-display">
                            <span className="current-price">
                              ${product.salePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {hasDiscount && (
                              <span className="original-price">
                                ${product.fullPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="product-card-actions">
                          <button
                            className="btn-add-cart"
                            onClick={() => addToCart(product)}
                          >
                            <FaShoppingCart size={13} /> Add to Cart
                          </button>
                          <button
                            className="btn-ask-ai"
                            onClick={() => askAiAboutProduct(product)}
                            title="Ask AI Concierge for dimensions, styling, and fabrics"
                          >
                            <FaRobot size={14} /> Ask AI
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* AI Concierge Feature Banner */}
        <section className="ai-banner-section">
          <div className="container">
            <div className="ai-banner-card">
              <div className="ai-banner-text">
                <span className="ai-banner-eyebrow"><FaRobot /> INTELLIGENT DESIGN ASSISTANT</span>
                <h2>Looking for custom styling advice or space measurements?</h2>
                <p>
                  Our AI Concierge connects directly to our live warehouse inventory to match colors,
                  check wood finishes, calculate room proportions, and give tailored advice.
                </p>
                <div className="ai-banner-prompts">
                  <button
                    className="ai-prompt-pill"
                    onClick={() => openGeneralChat("I have a 12x15 living room with oak floors. What sofa and coffee table pair best?")}
                  >
                    🛋️ Style my living room
                  </button>
                  <button
                    className="ai-prompt-pill"
                    onClick={() => openGeneralChat("Which office chairs have the best ergonomic lumbar support for 8+ hours?")}
                  >
                    🪑 Best ergonomic chair
                  </button>
                  <button
                    className="ai-prompt-pill"
                    onClick={() => openGeneralChat("Tell me about the outdoor teak conversation set and how it weathers.")}
                  >
                    🌿 Outdoor teak care
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Customer Testimonials */}
        <section className="testimonials-section">
          <div className="container">
            <div className="section-center-header">
              <span className="section-eyebrow">REVIEWS & STORIES</span>
              <h2 className="section-title">Loved by Architects & Homeowners</h2>
            </div>

            <div className="testimonials-grid">
              <div className="testimonial-card">
                <div className="stars">
                  {[...Array(5)].map((_, i) => <FaStar key={i} className="star-icon" size={13} />)}
                </div>
                <p className="testimonial-quote">
                  "The Aurelia velvet sofa exceeded all my expectations. The fabric has an incredible depth of color, and the frame feels solid and heavy. The AI assistant even helped me confirm my door width beforehand!"
                </p>
                <div className="testimonial-author">
                  <strong>Claire Vance</strong>
                  <span>Interior Architect, Chicago</span>
                </div>
              </div>

              <div className="testimonial-card">
                <div className="stars">
                  {[...Array(5)].map((_, i) => <FaStar key={i} className="star-icon" size={13} />)}
                </div>
                <p className="testimonial-quote">
                  "The Ridgefield Oak dining table is an heirloom piece. Real heavy French oak, zero wobble, and fits eight guests effortlessly. Shipping was smooth with full white glove setup."
                </p>
                <div className="testimonial-author">
                  <strong>Marcus Sterling</strong>
                  <span>Verified Homeowner, Austin</span>
                </div>
              </div>

              <div className="testimonial-card">
                <div className="stars">
                  {[...Array(5)].map((_, i) => <FaStar key={i} className="star-icon" size={13} />)}
                </div>
                <p className="testimonial-quote">
                  "The ErgoPro chair cured my chronic lower back stiffness after 3 days. Beautiful modern design that doesn’t look like an ugly corporate chair in my home office."
                </p>
                <div className="testimonial-author">
                  <strong>Evelyn Zhao</strong>
                  <span>Software Designer, Seattle</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="newsletter-section">
          <div className="container">
            <div className="newsletter-card">
              <div className="newsletter-content">
                <h2>Join the ShopSmart Design Circle</h2>
                <p>Receive exclusive early access to seasonal capsule drops, design guides, and $50 off your first purchase over $500.</p>
                <form className="newsletter-form" onSubmit={(e) => {
                  e.preventDefault()
                  showToast("Thank you for subscribing! Check your inbox for $50 off.")
                }}>
                  <input type="email" placeholder="Enter your email address" required />
                  <button type="submit" className="btn-primary">Subscribe</button>
                </form>
                <span className="newsletter-fineprint">We respect your privacy. Unsubscribe anytime.</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modern Luxury Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand-column">
              <div className="logo-section">
                <a href="#" className="logo">
                  <span className="logo-mark">SS</span>
                  <span className="logo-text">SHOPSMART</span>
                </a>
              </div>
              <p className="footer-desc">
                Architectural furniture created for refined living. Crafted with responsibly sourced woods,
                enduring natural textiles, and timeless proportions.
              </p>
              <div className="footer-contact-info">
                <span>📍 Flagship Showroom: 450 Design District, NY</span>
                <span>📞 +1 (800) 555-HOME</span>
                <span>✉️ concierge@shopsmart-home.com</span>
              </div>
            </div>

            <div className="footer-column">
              <h3>Furniture Collections</h3>
              <ul>
                <li><a href="#catalog" onClick={() => setSelectedCategory('Living Room')}>Living Room Seating</a></li>
                <li><a href="#catalog" onClick={() => setSelectedCategory('Dining Room')}>Solid Wood Dining</a></li>
                <li><a href="#catalog" onClick={() => setSelectedCategory('Office')}>Ergonomic Workspaces</a></li>
                <li><a href="#catalog" onClick={() => setSelectedCategory('Bedroom')}>Platform Beds & Nightstands</a></li>
                <li><a href="#catalog" onClick={() => setSelectedCategory('Outdoor')}>Weatherproof Patio Sets</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h3>Customer Care</h3>
              <ul>
                <li><a href="#shipping">White-Glove Shipping</a></li>
                <li><a href="#returns">30-Day In-Home Guarantee</a></li>
                <li><a href="#warranty">10-Year Craft Warranty</a></li>
                <li><a href="#tracking">Track My Delivery</a></li>
                <li><a href="#faq">Frequently Asked Questions</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h3>Our Philosophy</h3>
              <ul>
                <li><a href="#about">About ShopSmart</a></li>
                <li><a href="#sustainability">FSC® Sustainable Wood</a></li>
                <li><a href="#trade">Trade & Architect Program</a></li>
                <li><a href="#press">Press & Features</a></li>
                <li><a href="#careers">Join Our Team</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="copyright">
              &copy; {new Date().getFullYear()} ShopSmart Architectural Furniture Inc. All rights reserved.
            </div>
            <div className="footer-bottom-links">
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
              <a href="#accessibility">Accessibility</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating AI Chat Concierge */}
      <ChatWidget />
    </div>
  )
}

export default EcommerceStore