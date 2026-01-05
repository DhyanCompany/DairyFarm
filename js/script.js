// Milk Pour Animation Controller
class MilkPourAnimation {
    constructor() {
        this.glass = document.querySelector('.milk-glass');
        this.milkLevel = document.getElementById('milkLevel');
        this.milkPour = document.getElementById('milkPour');
        this.receivingContainer = document.getElementById('receivingContainer');
        this.containerLiquid = document.querySelector('.container-liquid');
        
        this.scrollProgress = 0;
        this.isAnimating = false;
        
        this.init();
    }
    
    init() {
        // Set initial state
        this.resetAnimation();
        
        // Add scroll event listener
        window.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Add resize event listener
        window.addEventListener('resize', this.resetAnimation.bind(this));
        
        // Add click event for demo
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-add-to-cart')) {
                this.triggerPourAnimation();
            }
        });
    }
    
    resetAnimation() {
        // Reset to initial state
        this.glass.style.transform = 'translateX(-50%) rotate(0deg)';
        this.milkLevel.style.height = '80%';
        this.milkPour.style.height = '0px';
        this.milkPour.style.transform = 'translateX(-50%) rotate(0deg)';
        this.containerLiquid.style.height = '0%';
        this.scrollProgress = 0;
    }
    
    handleScroll() {
        // Calculate scroll progress (0 to 1)
        const scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Calculate progress from 0 to 1
        this.scrollProgress = Math.min(scrollPosition / (documentHeight - windowHeight), 1);
        
        // Update animation based on scroll progress
        this.updateAnimation();
        
        // Trigger GSAP animation if needed
        this.triggerScrollAnimation();
    }
    
    updateAnimation() {
        // Only animate between certain scroll ranges
        const pourStart = 0.1; // Start pouring at 10% scroll
        const pourEnd = 0.5; // Finish pouring at 50% scroll
        
        if (this.scrollProgress >= pourStart && this.scrollProgress <= pourEnd) {
            // Calculate pour progress (0 to 1)
            const pourProgress = (this.scrollProgress - pourStart) / (pourEnd - pourStart);
            
            // Rotate glass
            const glassRotation = pourProgress * 45; // Up to 45 degrees
            this.glass.style.transform = `translateX(-50%) rotate(${glassRotation}deg)`;
            
            // Lower milk level in glass
            const milkLevelHeight = 80 - (pourProgress * 60); // From 80% to 20%
            this.milkLevel.style.height = `${milkLevelHeight}%`;
            
            // Extend pouring stream
            const streamHeight = pourProgress * 200; // Up to 200px
            this.milkPour.style.height = `${streamHeight}px`;
            this.milkPour.style.transform = `translateX(-50%) rotate(${glassRotation}deg)`;
            
            // Fill receiving container
            const containerFill = pourProgress * 80; // Up to 80%
            this.containerLiquid.style.height = `${containerFill}%`;
            
            // Add drip effect occasionally
            if (Math.random() > 0.8) {
                this.createDrip();
            }
        }
    }
    
    triggerScrollAnimation() {
        if (this.scrollProgress > 0.3 && !this.isAnimating) {
            this.isAnimating = true;
            
            // GSAP animation for smooth pouring
            gsap.to(this.milkPour, {
                height: 200,
                duration: 2,
                ease: "power2.out",
                onComplete: () => {
                    this.isAnimating = false;
                }
            });
        }
    }
    
    triggerPourAnimation() {
        // Reset first
        this.resetAnimation();
        
        // GSAP timeline for pouring animation
        const tl = gsap.timeline();
        
        tl.to(this.glass, {
            rotate: 45,
            duration: 0.5,
            ease: "back.out(1.7)"
        })
        .to(this.milkLevel, {
            height: "20%",
            duration: 1,
            ease: "power2.inOut"
        }, "-=0.3")
        .to(this.milkPour, {
            height: 200,
            duration: 1,
            ease: "power2.out"
        }, "-=0.8")
        .to(this.containerLiquid, {
            height: "80%",
            duration: 1.5,
            ease: "power2.inOut"
        }, "-=1")
        .to(this.glass, {
            rotate: 0,
            duration: 0.5,
            ease: "back.in(1.7)"
        })
        .to(this.milkPour, {
            height: 0,
            duration: 0.3,
            ease: "power2.in"
        });
    }
    
    createDrip() {
        // Create a drip element
        const drip = document.createElement('div');
        drip.className = 'drip';
        drip.style.cssText = `
            position: absolute;
            width: 8px;
            height: 8px;
            background: rgba(255,250,240,0.9);
            border-radius: 50%;
            top: ${this.milkPour.offsetTop + this.milkPour.offsetHeight}px;
            left: ${this.milkPour.offsetLeft + 6}px;
            z-index: 1;
        `;
        
        document.querySelector('.milk-animation-container').appendChild(drip);
        
        // Animate drip falling
        gsap.to(drip, {
            y: 100,
            duration: 0.8,
            ease: "power2.in",
            opacity: 0,
            onComplete: () => drip.remove()
        });
    }
}

// Animated Counter
class AnimatedCounter {
    constructor() {
        this.counters = document.querySelectorAll('[data-count]');
        this.init();
    }
    
    init() {
        // Start counting when element is in viewport
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        this.counters.forEach(counter => observer.observe(counter));
    }
    
    animateCounter(element) {
        const target = parseInt(element.getAttribute('data-count'));
        const duration = 2000; // 2 seconds
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, duration / steps);
    }
}

// Interactive Product Cards
class ProductInteraction {
    constructor() {
        this.cart = [];
        this.init();
    }
    
    init() {
        // Add to cart buttons
        document.querySelectorAll('.btn-add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                this.addToCart(e);
            });
        });
        
        // Quick view buttons
        document.querySelectorAll('.btn-quick-view').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showQuickView(e);
            });
        });
        
        // Product card hover effects
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-10px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });
    }
    
    addToCart(event) {
        const button = event.target.closest('.btn-add-to-cart');
        const product = button.getAttribute('data-product');
        
        // Add to cart array
        this.cart.push(product);
        
        // Show notification
        this.showNotification(`${product} added to cart!`);
        
        // Animate button
        gsap.to(button, {
            scale: 1.2,
            duration: 0.2,
            yoyo: true,
            repeat: 1
        });
        
        // Update cart count
        this.updateCartCount();
    }
    
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 30px;
            background: linear-gradient(135deg, var(--deep-blue), var(--medium-blue));
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(33, 150, 243, 0.3);
            transform: translateX(100%);
            opacity: 0;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in and out
        gsap.to(notification, {
            x: 0,
            opacity: 1,
            duration: 0.5,
            ease: "back.out(1.7)"
        });
        
        setTimeout(() => {
            gsap.to(notification, {
                x: 100,
                opacity: 0,
                duration: 0.5,
                ease: "back.in(1.7)",
                onComplete: () => notification.remove()
            });
        }, 3000);
    }
    
    updateCartCount() {
        const cartCount = document.querySelector('.cart-count');
        if (!cartCount) {
            // Create cart count badge
            const badge = document.createElement('span');
            badge.className = 'cart-count';
            badge.textContent = this.cart.length;
            badge.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ff5252;
                color: white;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                font-size: 0.7rem;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            const cartBtn = document.querySelector('.btn-order');
            cartBtn.style.position = 'relative';
            cartBtn.appendChild(badge);
        } else {
            cartCount.textContent = this.cart.length;
            gsap.to(cartCount, {
                scale: 1.5,
                duration: 0.2,
                yoyo: true,
                repeat: 1
            });
        }
    }
    
    showQuickView(event) {
        const card = event.target.closest('.product-card');
        const productName = card.querySelector('h3').textContent;
        
        // Create quick view modal
        const modal = document.createElement('div');
        modal.className = 'quick-view-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h3>${productName}</h3>
                <p>Product details coming soon...</p>
                <button class="btn btn-primary">Order Now</button>
            </div>
        `;
        
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 0;
        `;
        
        document.body.appendChild(modal);
        
        // Animate in
        gsap.to(modal, {
            opacity: 1,
            duration: 0.3
        });
        
        // Close modal on click
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('close-modal')) {
                gsap.to(modal, {
                    opacity: 0,
                    duration: 0.3,
                    onComplete: () => modal.remove()
                });
            }
        });
    }
}

// Parallax Scrolling Effect
class ParallaxEffect {
    constructor() {
        this.init();
    }
    
    init() {
        // Create floating elements parallax
        const floatingElements = document.querySelectorAll('.floating');
        
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            
            floatingElements.forEach((element, index) => {
                const speed = 0.1 + (index * 0.05);
                const yPos = -(scrolled * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });
        });
    }
}

// Form Handling
class FormHandler {
    constructor() {
        this.init();
    }
    
    init() {
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', this.handleSubmit.bind(this));
        }
    }
    
    handleSubmit(event) {
        event.preventDefault();
        
        // Show success message
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled = true;
        
        // Simulate API call
        setTimeout(() => {
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Sent Successfully!';
            submitBtn.style.background = 'linear-gradient(135deg, #4CAF50, #2E7D32)';
            
            // Reset form
            form.reset();
            
            // Reset button after 3 seconds
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                submitBtn.style.background = '';
            }, 3000);
        }, 2000);
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize milk pour animation
    const milkAnimation = new MilkPourAnimation();
    
    // Initialize animated counters
    const counters = new AnimatedCounter();
    
    // Initialize product interactions
    const products = new ProductInteraction();
    
    // Initialize parallax effect
    const parallax = new ParallaxEffect();
    
    // Initialize form handling
    const forms = new FormHandler();
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Add ripple effect to buttons
    document.querySelectorAll('.btn-primary, .btn-add-to-cart').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.7);
                transform: scale(0);
                animation: ripple 0.6s linear;
                width: ${size}px;
                height: ${size}px;
                top: ${y}px;
                left: ${x}px;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
    
    // Add CSS for ripple animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Add hover sound effect (optional)
    document.querySelectorAll('.btn-add-to-cart').forEach(button => {
        button.addEventListener('mouseenter', () => {
            // You could add a subtle sound effect here
            console.log('Button hovered');
        });
    });
});

// Service Worker for PWA (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
            (registration) => {
                console.log('Service Worker registered: ', registration);
            },
            (error) => {
                console.log('Service Worker registration failed: ', error);
            }
        );
    });
}

// Touch device detection
const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Device-specific optimizations
if (isTouchDevice()) {
    document.body.classList.add('touch-device');
    
    // Increase tap targets for mobile
    document.querySelectorAll('button, .nav-link').forEach(element => {
        element.style.minHeight = '44px';
        element.style.minWidth = '44px';
    });
}

// Performance optimization
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Reinitialize animations on resize
        document.querySelectorAll('[data-aos]').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
        });
        
        setTimeout(() => {
            AOS.refresh();
        }, 100);
    }, 250);
});