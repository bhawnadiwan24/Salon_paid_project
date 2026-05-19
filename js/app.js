import { db, collection, getDocs, addDoc } from './firebase.js';

// ---- UI Helpers ----
const showToast = (message, isError = false) => {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = isError ? '#ff4757' : 'var(--primary-blue)';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(100px)';
    }, 4000);
};

// Smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// ---- Mobile Navbar Logic ----
const mobileMenuIcon = document.getElementById('mobileMenuIcon');
const navLinks = document.getElementById('navLinks');

if (mobileMenuIcon && navLinks) {
    mobileMenuIcon.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = mobileMenuIcon.querySelector('i');
        if (navLinks.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    // Close menu when clicking any nav link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            const icon = mobileMenuIcon.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        });
    });
}

// ---- Fetch Data ----

// Fallback static data if Firebase isn't configured yet to ensure UI works visually
const defaultServices = [
    { name: 'Bridal Makeover', desc: 'Complete premium bridal package with HD makeup.', price: 15000, image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?q=80&w=2071&auto=format&fit=crop' },
    { name: 'Hair Spa & Treatment', desc: 'Deep conditioning keratin and smoothing treatments.', price: 2500, image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=2069&auto=format&fit=crop' },
    { name: 'Premium Haircut', desc: 'Expert styling and texturing for men and women.', price: 800, image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop' },
    { name: 'Nail Art & Extension', desc: 'Acrylic extensions with custom premium designs.', price: 1200, image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?q=80&w=2069&auto=format&fit=crop' }
];

const defaultGallery = [
    { url: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=2069&auto=format&fit=crop', title: 'Hair Coloring' },
    { url: 'https://images.unsplash.com/photo-1516975080661-460ce9ea1f93?q=80&w=2000&auto=format&fit=crop', title: 'Makeup' },
    { url: 'https://images.unsplash.com/photo-1600948836101-f9ff52d7e1cc?q=80&w=2070&auto=format&fit=crop', title: 'Pedicure' }
];

let cachedServices = [];

async function loadServices() {
    const grid = document.getElementById('servicesGrid');
    const select = document.getElementById('b_service');
    
    try {
        const querySnapshot = await getDocs(collection(db, "services"));
        cachedServices = [];
        querySnapshot.forEach((doc) => {
            cachedServices.push({ id: doc.id, ...doc.data() });
        });
        
        if (cachedServices.length === 0) {
            // Use defaults if db is empty or not configured yet
            cachedServices = defaultServices.map((s, i) => ({ id: `default_${i}`, ...s }));
        }
    } catch (e) {
        console.warn("Firebase not configured or errors fetching services. Using defaults.", e);
        cachedServices = defaultServices.map((s, i) => ({ id: `default_${i}`, ...s }));
    }

    // Render HTML
    grid.innerHTML = '';
    select.innerHTML = '<option value="" disabled selected>Select a Service</option>';
    
    cachedServices.forEach(service => {
        // Render Card
        const card = document.createElement('div');
        card.className = 'service-card';
        card.innerHTML = `
            <div class="service-img">
                <img src="${service.image}" alt="${service.name}">
            </div>
            <div class="service-content">
                <h3>${service.name}</h3>
                <p>${service.desc}</p>
                <div class="service-footer">
                    <span class="price">₹${service.price}</span>
                    <a href="#book" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">Book</a>
                </div>
            </div>
        `;
        grid.appendChild(card);
        
        // Render Select Option
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `${service.name} - ₹${service.price}`;
        option.dataset.price = service.price;
        option.dataset.name = service.name;
        select.appendChild(option);
    });

    // Reattach smooth scroll for new dynamic buttons
    grid.querySelectorAll('a[href="#book"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector('#book').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

async function loadGallery() {
    const grid = document.getElementById('galleryGrid');
    let images = [];
    
    try {
        const querySnapshot = await getDocs(collection(db, "gallery"));
        querySnapshot.forEach((doc) => {
            images.push({ id: doc.id, ...doc.data() });
        });
        if (images.length === 0) {
            images = defaultGallery;
        }
    } catch (e) {
        console.warn("Using default gallery.");
        images = defaultGallery;
    }

    grid.innerHTML = '';
    images.forEach(img => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <img src="${img.url}" alt="${img.title || 'Salon Image'}">
            <div class="gallery-overlay">
                <h3 style="color: white; font-family: 'Playfair Display', serif;">${img.title || ''}</h3>
            </div>
        `;
        grid.appendChild(item);
    });
}

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadGallery();
});

// ---- Booking & Payment Logic ----

const bookingForm = document.getElementById('bookingForm');
const loadingIndicator = document.getElementById('booking-loading');
const submitBtn = bookingForm.querySelector('button[type="submit"]');

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get Form Data
    const name = document.getElementById('b_name').value;
    const phone = document.getElementById('b_phone').value;
    const serviceSelect = document.getElementById('b_service');
    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    
    const serviceId = serviceSelect.value;
    const serviceName = selectedOption.dataset.name;
    const price = parseInt(selectedOption.dataset.price);
    
    const date = document.getElementById('b_date').value;
    const time = document.getElementById('b_time').value;
    const paymentMethod = bookingForm.querySelector('input[name="payment_method"]:checked').value;

    if (!serviceId) {
        showToast("Please select a valid service.", true);
        return;
    }

    // Toggle Loading State
    submitBtn.classList.add('d-none');
    loadingIndicator.classList.remove('d-none');

    // Handle Offline Payment (COD)
    if (paymentMethod === 'offline') {
        setTimeout(() => {
            finalizeBooking(name, phone, serviceName, price, date, time, "OFFLINE_COD", "Offline");
        }, 1200);
        return;
    }

    // Razorpay Integration (Test Mode)
    // NOTE: Replace 'YOUR_RAZORPAY_KEY' with actual actual Razorpay publishable test key.
    const options = {
        key: "YOUR_RAZORPAY_KEY", 
        amount: price * 100, // Amount in paise
        currency: "INR",
        name: "Arjun's Unisex Salon",
        description: `Booking for ${serviceName}`,
        image: "https://via.placeholder.com/150", 
        handler: async function (response) {
            // Payment success callback
            console.log("Payment Success:", response);
            await finalizeBooking(name, phone, serviceName, price, date, time, response.razorpay_payment_id, "Online");
        },
        prefill: {
            name: name,
            contact: phone
        },
        theme: {
            color: "#0A2351" // match primary-blue
        },
        modal: {
            ondismiss: function() {
                // Payment cancelled by user
                showToast("Payment cancelled. Booking was not completed.", true);
                resetButtonState();
            }
        }
    };

    try {
        const rzp = new Razorpay(options);
        rzp.open();
    } catch (e) {
        console.error("Razorpay Error:", e);
        // Fallback fake success if razorpay setup fails
        showToast("Razorpay not configured. Simulating success for demo...", false);
        setTimeout(() => {
            finalizeBooking(name, phone, serviceName, price, date, time, "SIMULATED_PAY_ID", "Online");
        }, 1500);
    }
});

function resetButtonState() {
    submitBtn.classList.remove('d-none');
    loadingIndicator.classList.add('d-none');
}

async function finalizeBooking(name, phone, serviceName, price, date, time, payId, paymentMethod) {
    try {
        // 1. Save to Firestore
        const bookingData = {
            name,
            phone,
            serviceName,
            price,
            date,
            time,
            paymentId: payId,
            paymentMethod: paymentMethod || "Online",
            status: "Pending", // Admin can change this to completed later
            createdAt: new Date().toISOString()
        };
        
        try {
            await addDoc(collection(db, "bookings"), bookingData);
        } catch(dbErr) {
            console.error("Firestore save skipped. Config error/rules?", dbErr);
            showToast("Failed to save booking to database. Please check Firestore Rules.", true);
            alert("BOOKING FAILED TO SAVE!\n\nIf you are the admin, please check your Firebase Firestore Rules. Unauthenticated users must be allowed to 'write' to the 'bookings' collection.");
            resetButtonState();
            return; // Stop execution, don't show success message
        }

        // 2. Send email via EmailJS
        // NOTE: Replace keys below with true EmailJS service/template IDs
        emailjs.init("YOUR_EMAILJS_PUBLIC_KEY");
        try {
            await emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
                user_name: name,
                user_phone: phone,
                service: serviceName,
                date: date,
                time: time,
                payment_method: paymentMethod || "Online",
                admin_email: "admin@arjunsalon.com" // Where the alert goes
            });
        } catch(emailErr) {
            console.warn("EmailJS skipped. Config error?", emailErr);
        }

        showToast(`🎉 Appointment booked successfully! We'll see you on ${date}.`);
        bookingForm.reset();
        
    } catch (error) {
        console.error("Booking Finalization Error:", error);
        showToast("Error saving booking details.", true);
    } finally {
        resetButtonState();
    }
}
