import { 
    auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut,
    googleProvider, signInWithPopup,
    db, collection, getDocs, addDoc, doc, deleteDoc, updateDoc
} from './firebase.js';

// ---- UI Helpers ----
const showToast = (message, isError = false) => {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = isError ? '#ff4757' : 'var(--primary-blue)';
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
    }, 4000);
};

// Helper: Compress and convert image to Base64 to save directly in Firestore
const compressImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height && width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                } else if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to compressed jpeg
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

window.closeModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => {
        if(m.id !== 'loginOverlay') m.classList.remove('active');
    });
};

// ---- View Routing Logic ----
const navLinks = document.querySelectorAll('.nav-menu a[data-target]');
const views = document.querySelectorAll('.content-view');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-target');
        
        // Update Nav UI
        navLinks.forEach(n => n.parentElement.classList.remove('active'));
        link.parentElement.classList.add('active');
        
        // Switch Views
        views.forEach(v => {
            if(v.id === `view-${target}`) {
                v.classList.remove('d-none');
            } else {
                v.classList.add('d-none');
            }
        });
        
        // Mobile sidebar close
        if(window.innerWidth <= 900) {
            document.querySelector('.sidebar').classList.remove('open');
        }
    });
});

// ---- Authentication Logic ----
const loginOverlay = document.getElementById('loginOverlay');
const appLayout = document.getElementById('appLayout');
const loginForm = document.getElementById('adminLoginForm');
const logoutBtn = document.getElementById('logoutBtn');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Logged In
        loginOverlay.classList.remove('active');
        appLayout.style.display = 'flex';
        loadDashboardData();
    } else {
        // Logged Out
        loginOverlay.classList.add('active');
        appLayout.style.display = 'none';
        
        // Fallback for visual testing if Firebase isn't set up
        console.warn("Auth state: Not logged in. If Firebase is not configured, login will fail.");
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const pass = document.getElementById('adminPassword').value;
    
    try {
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.innerText = 'Logging in...';
        loginBtn.disabled = true;
        
        await signInWithEmailAndPassword(auth, email, pass);
        // UI transition will now be handled automatically by onAuthStateChanged
        
    } catch (error) {
        console.error("Auth Failed:", error.message);
        showToast("Login failed: " + error.message, true);
        alert("LOGIN FAILED: " + error.message + "\n\nMake sure your password is exactly what you used when you created the account!");
    } finally {
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.innerText = 'Login';
        loginBtn.disabled = false;
    }
});

const registerBtn = document.getElementById('registerBtn');
if (registerBtn) {
    registerBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const pass = document.getElementById('adminPassword').value;
        
        if(!email || !pass) {
            showToast("Please enter an email and password to register.", true);
            return;
        }

        try {
            registerBtn.innerText = 'Creating...';
            registerBtn.disabled = true;
            
            await createUserWithEmailAndPassword(auth, email, pass);
            
            // UI transition will now be handled automatically by onAuthStateChanged
            
            showToast("Admin account created successfully! You are now logged in.");
            alert("SUCCESS! Account created.");
        } catch (error) {
            console.error("Registration Failed:", error.message);
            showToast("Registration failed: " + error.message, true);
            alert("REGISTRATION FAILED: " + error.message);
        } finally {
            registerBtn.innerText = 'Create Admin Account';
            registerBtn.disabled = false;
        }
    });
}

const googleLoginBtn = document.getElementById('googleLoginBtn');
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        try {
            googleLoginBtn.disabled = true;
            googleLoginBtn.innerText = 'Connecting...';
            
            await signInWithPopup(auth, googleProvider);
            
            // UI transition will now be handled automatically by onAuthStateChanged
            
            showToast("Logged in with Google!");
        } catch (error) {
            console.error("Google Auth Failed:", error.message);
            showToast("Google login failed: " + error.message, true);
        } finally {
            googleLoginBtn.disabled = false;
            googleLoginBtn.innerHTML = `
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style="width: 18px; height: 18px; margin-right: 10px;">
                Continue with Google
            `;
        }
    });
}

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
    } catch(e) {
        console.log("Logged out (demo)");
        window.location.reload();
    }
});

// ---- Dashboard & Data Loaders ----

async function loadDashboardData() {
    loadServices();
    loadGallery();
    loadBookings();
}

// 1. Services Management
const serviceModal = document.getElementById('serviceModal');
const serviceForm = document.getElementById('serviceForm');
const servicesTableBody = document.querySelector('#servicesTable tbody');

document.getElementById('openAddServiceModal').addEventListener('click', () => {
    document.getElementById('serviceModalTitle').innerText = 'Add Service';
    serviceForm.reset();
    document.getElementById('serviceId').value = '';
    serviceModal.classList.add('active');
});

async function loadServices() {
    try {
        const querySnapshot = await getDocs(collection(db, "services"));
        servicesTableBody.innerHTML = '';
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            renderServiceRow(docSnap.id, data);
        });
    } catch(e) {
        console.warn("DB not ready, rendering empty services.");
        servicesTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No services found. Add one!</td></tr>';
    }
}

function renderServiceRow(id, data) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><img src="${data.image || 'https://via.placeholder.com/50'}" style="width: 50px; height: 50px; border-radius: 4px; object-fit: cover;"></td>
        <td><strong>${data.name}</strong></td>
        <td>₹${data.price}</td>
        <td>
            <button class="btn btn-outline" style="padding: 0.3rem 0.6rem;" onclick="deleteService('${id}')"><i class="fas fa-trash"></i></button>
        </td>
    `;
    servicesTableBody.appendChild(tr);
}

serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('saveServiceBtn');
    saveBtn.innerText = 'Saving...';
    saveBtn.disabled = true;

    try {
        const id = document.getElementById('serviceId').value;
        const name = document.getElementById('serviceName').value;
        const desc = document.getElementById('serviceDesc').value;
        const price = document.getElementById('servicePrice').value;
        const fileInput = document.getElementById('serviceImage');
        
        let imageUrl = '';
        
        // Handle Image Upload using Base64 directly to Firestore (Bypassing Storage!)
        if(fileInput.files.length > 0) {
            const file = fileInput.files[0];
            imageUrl = await compressImageToBase64(file);
        } else {
            // Optional fallback
            imageUrl = 'https://via.placeholder.com/400?text=Service+Image';
        }

        const payload = { name, desc, price: parseInt(price), image: imageUrl };

        if(id) {
            await updateDoc(doc(db, "services", id), payload);
            showToast("Service updated!");
        } else {
            await addDoc(collection(db, "services"), payload);
            showToast("Service added!");
        }
        
        closeModals();
        loadServices(); // reload
    } catch(e) {
        console.error("Save error:", e);
        showToast("Error saving service (Firebase missing?)", true);
    } finally {
        saveBtn.innerText = 'Save Service';
        saveBtn.disabled = false;
    }
});

window.deleteService = async (id) => {
    if(confirm("Are you sure you want to delete this service?")) {
        try {
            await deleteDoc(doc(db, "services", id));
            showToast("Service deleted.");
            loadServices();
        } catch(e) {
            showToast("Error deleting", true);
        }
    }
};

// 2. Gallery Management
const galleryModal = document.getElementById('galleryModal');
const galleryForm = document.getElementById('galleryForm');
const adminGalleryGrid = document.getElementById('adminGalleryGrid');

document.getElementById('openAddGalleryModal').addEventListener('click', () => {
    galleryForm.reset();
    galleryModal.classList.add('active');
});

async function loadGallery() {
    try {
        const querySnapshot = await getDocs(collection(db, "gallery"));
        adminGalleryGrid.innerHTML = '';
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.innerHTML = `
                <img src="${data.url}" alt="${data.title}">
                <div class="gallery-overlay" style="flex-direction: column; justify-content: center; align-items: center; gap: 10px; background: rgba(0,0,0,0.6)">
                    <p style="color:white; font-size:0.9rem;">${data.title || 'No Title'}</p>
                    <button class="btn btn-primary" onclick="deleteGalleryItem('${docSnap.id}')" style="padding: 0.3rem 1rem;"><i class="fas fa-trash"></i> Delete</button>
                </div>
            `;
            adminGalleryGrid.appendChild(item);
        });
    } catch(e) {
        adminGalleryGrid.innerHTML = '<p>Gallery loaded from DB will appear here.</p>';
    }
}

galleryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('saveGalleryBtn');
    saveBtn.innerText = 'Uploading...';
    saveBtn.disabled = true;

    try {
        const title = document.getElementById('galleryTitle').value;
        const fileInput = document.getElementById('galleryImage');
        const file = fileInput.files[0];
        
        // Use the base64 compression helper
        const url = await compressImageToBase64(file);

        await addDoc(collection(db, "gallery"), { title, url });
        
        showToast("Image uploaded to gallery!");
        closeModals();
        loadGallery();
    } catch(e) {
        console.error(e);
        showToast("Error uploading image", true);
    } finally {
        saveBtn.innerText = 'Upload';
        saveBtn.disabled = false;
    }
});

window.deleteGalleryItem = async (id) => {
    if(confirm("Delete this gallery image?")) {
        try {
            await deleteDoc(doc(db, "gallery", id));
            showToast("Image removed.");
            loadGallery();
        } catch(e) {
            showToast("Error deleting", true);
        }
    }
};

// 3. Bookings Management
async function loadBookings() {
    try {
        const querySnapshot = await getDocs(collection(db, "bookings"));
        const allTbody = document.querySelector('#allBookingsTable tbody');
        const recentTbody = document.querySelector('#recentBookingsTable tbody');
        
        allTbody.innerHTML = '';
        recentTbody.innerHTML = '';
        
        let total = 0;
        let pending = 0;
        let completed = 0;
        
        // Sort by dates for recent bookings
        let allBookingsArray = [];
        querySnapshot.forEach((doc) => {
            allBookingsArray.push({id: doc.id, ...doc.data()});
        });

        allBookingsArray.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        allBookingsArray.forEach((data, index) => {
            total++;
            if(data.status === 'Completed') completed++;
            else pending++;

            // Render Full List Row
            allTbody.appendChild(createBookingRow(data.id, data, true));
            
            // Render Recent List Row (only top 5)
            if(index < 5) {
                recentTbody.appendChild(createBookingRow(data.id, data, false));
            }
        });
        
        // Update Dash Stats
        document.getElementById('statTotal').innerText = total;
        document.getElementById('statPending').innerText = pending;
        document.getElementById('statCompleted').innerText = completed;

        if (total === 0) {
            allTbody.innerHTML = '<tr><td colspan="7" class="text-center">No bookings found.</td></tr>';
            recentTbody.innerHTML = '<tr><td colspan="4" class="text-center">No recent bookings.</td></tr>';
        }

    } catch(e) {
        console.warn("DB not ready. Bookings table empty.");
    }
}

function createBookingRow(id, data, isFullView) {
    const tr = document.createElement('tr');
    const badgeClass = data.status === 'Completed' ? 'badge-completed' : 'badge-pending';
    
    if(isFullView) {
        tr.innerHTML = `
            <td><strong>${data.name}</strong></td>
            <td>${data.phone}</td>
            <td>${data.serviceName}</td>
            <td>${data.date} <br> <small>${data.time}</small></td>
            <td>
                <span style="display:block; font-size:0.85rem; font-weight:600; color:${data.paymentMethod === 'Offline' ? '#e67e22' : '#27ae60'}">${data.paymentMethod || 'Online'}</span>
                <small style="color:#888;">${data.paymentId || 'N/A'}</small>
            </td>
            <td><span class="badge ${badgeClass}">${data.status}</span></td>
            <td>
                ${data.status !== 'Completed' ? `<button class="btn btn-outline" style="padding:0.2rem 0.5rem; font-size:0.8rem;" onclick="markBookingCompleted('${id}')"><i class="fas fa-check"></i> Complete</button>` : ''}
            </td>
        `;
    } else {
        tr.innerHTML = `
            <td><strong>${data.name}</strong></td>
            <td>${data.serviceName}</td>
            <td>${data.date}</td>
            <td><span class="badge ${badgeClass}">${data.status}</span></td>
        `;
    }
    return tr;
}

window.markBookingCompleted = async (id) => {
    if(confirm("Mark this appointment as Completed?")) {
        try {
            await updateDoc(doc(db, "bookings", id), { status: 'Completed' });
            showToast("Booking completed!");
            loadBookings();
        } catch(e) {
            showToast("Error updating booking.", true);
        }
    }
};
