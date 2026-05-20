import { 
    auth, onAuthStateChanged, signOut,
    db, collection, getDocs, addDoc, doc, deleteDoc, updateDoc
} from './firebase.js';

// ---- CONFIG ----
const ALLOWED_EMAILS = [
    'bhawnadiwan24@navgurukul.org',
    'arjunssalonjsp@gmail.com'
];

// ---- UI Helpers ----
const showToast = (message, isError = false) => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isError ? '#ff4757' : 'var(--primary-blue)';
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
    }, 4000);
};

// Helper: Compress and convert image to Base64
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
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

window.closeModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.classList.remove('active');
    });
};

// ---- Mobile Sidebar ----
const adminSidebar = document.getElementById('adminSidebar');
const adminMobileToggle = document.getElementById('adminMobileToggle');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
    if (adminSidebar) adminSidebar.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
}

function closeSidebar() {
    if (adminSidebar) adminSidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
}

if (adminMobileToggle) adminMobileToggle.addEventListener('click', openSidebar);
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

// ---- View Routing ----
const navLinks = document.querySelectorAll('.nav-menu a[data-target]');
const views = document.querySelectorAll('.content-view');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-target');
        
        navLinks.forEach(n => n.parentElement.classList.remove('active'));
        link.parentElement.classList.add('active');
        
        views.forEach(v => {
            if(v.id === `view-${target}`) {
                v.classList.remove('d-none');
            } else {
                v.classList.add('d-none');
            }
        });
        
        if(window.innerWidth <= 900) closeSidebar();
    });
});

// ---- Auth Watcher & Data Load ----
onAuthStateChanged(auth, (user) => {
    if (user && ALLOWED_EMAILS.includes(user.email)) {
        loadDashboardData();
    } else {
        window.location.href = 'secure-access.html';
    }
});

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            window.location.href = 'secure-access.html';
        } catch(err) {
            console.error("Logout error", err);
        }
    });
}

// 1. Load Everything
async function loadDashboardData() {
    loadServices();
    loadGallery();
    loadBookings();
}

// 2. Services
const serviceModal = document.getElementById('serviceModal');
const serviceForm = document.getElementById('serviceForm');
const servicesTableBody = document.querySelector('#servicesTable tbody');

const openAddBtn = document.getElementById('openAddServiceModal');
if (openAddBtn) {
    openAddBtn.addEventListener('click', () => {
        document.getElementById('serviceModalTitle').innerText = 'Add Service';
        serviceForm.reset();
        document.getElementById('serviceId').value = '';
        serviceModal.classList.add('active');
    });
}

async function loadServices() {
    try {
        const querySnapshot = await getDocs(collection(db, "services"));
        if (servicesTableBody) {
            servicesTableBody.innerHTML = '';
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                renderServiceRow(docSnap.id, data);
            });
        }
    } catch(e) {
        console.error("Error loading services", e);
    }
}

function renderServiceRow(id, data) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td data-label="Image"><img src="${data.image || 'https://via.placeholder.com/50'}" style="width: 50px; height: 50px; border-radius: 4px; object-fit: cover;"></td>
        <td data-label="Name"><strong>${data.name}</strong></td>
        <td data-label="Price">₹${data.price}</td>
        <td data-label="Actions">
            <button class="btn btn-outline" style="padding: 0.3rem 0.6rem;" onclick="deleteService('${id}')"><i class="fas fa-trash"></i></button>
        </td>
    `;
    servicesTableBody.appendChild(tr);
}

if (serviceForm) {
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
            
            let imageUrl = 'https://via.placeholder.com/400?text=Service+Image';
            if(fileInput.files.length > 0) {
                imageUrl = await compressImageToBase64(fileInput.files[0]);
            }

            const payload = { name, desc, price: parseInt(price), image: imageUrl };

            if(id) {
                await updateDoc(doc(db, "services", id), payload);
                showToast("Service updated!");
            } else {
                await addDoc(collection(db, "services"), payload);
                showToast("Service added!");
            }
            
            window.closeModals();
            loadServices();
        } catch(e) {
            showToast("Error saving service", true);
        } finally {
            saveBtn.innerText = 'Save Service';
            saveBtn.disabled = false;
        }
    });
}

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

// 3. Gallery
const galleryModal = document.getElementById('galleryModal');
const galleryForm = document.getElementById('galleryForm');
const galleryTableBody = document.getElementById('galleryTableBody');

const openAddGalleryBtn = document.getElementById('openAddGalleryModal');
if (openAddGalleryBtn) {
    openAddGalleryBtn.addEventListener('click', () => {
        galleryForm.reset();
        galleryModal.classList.add('active');
    });
}

async function loadGallery() {
    try {
        const querySnapshot = await getDocs(collection(db, "gallery"));
        if (galleryTableBody) {
            galleryTableBody.innerHTML = '';
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Image"><img src="${data.url}" alt="${data.title}" style="width: 80px; height: 60px; border-radius: 4px; object-fit: cover;"></td>
                    <td data-label="Title"><strong>${data.title || 'No Title'}</strong></td>
                    <td data-label="Actions">
                        <button class="btn btn-outline" style="padding: 0.3rem 0.6rem;" onclick="deleteGalleryItem('${docSnap.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                galleryTableBody.appendChild(tr);
            });
        }
    } catch(e) {
        console.error("Gallery error", e);
    }
}

if (galleryForm) {
    galleryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveGalleryBtn');
        saveBtn.innerText = 'Uploading...';
        saveBtn.disabled = true;

        try {
            const title = document.getElementById('galleryTitle').value;
            const fileInput = document.getElementById('galleryImage');
            const url = await compressImageToBase64(fileInput.files[0]);
            await addDoc(collection(db, "gallery"), { title, url });
            showToast("Image uploaded!");
            window.closeModals();
            loadGallery();
        } catch(e) {
            showToast("Error uploading", true);
        } finally {
            saveBtn.innerText = 'Upload';
            saveBtn.disabled = false;
        }
    });
}

window.deleteGalleryItem = async (id) => {
    if(confirm("Delete image?")) {
        try {
            await deleteDoc(doc(db, "gallery", id));
            showToast("Image removed.");
            loadGallery();
        } catch(e) {
            showToast("Error deleting", true);
        }
    }
};

// 4. Bookings
async function loadBookings() {
    try {
        const querySnapshot = await getDocs(collection(db, "bookings"));
        const allTbody = document.querySelector('#allBookingsTable tbody');
        const recentTbody = document.querySelector('#recentBookingsTable tbody');
        
        if (!allTbody) return;
        allTbody.innerHTML = '';
        recentTbody.innerHTML = '';
        
        let total = 0, pending = 0, completed = 0;
        let bookings = [];
        querySnapshot.forEach(doc => bookings.push({id: doc.id, ...doc.data()}));
        bookings.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        bookings.forEach((data, i) => {
            total++;
            if(data.status === 'Completed') completed++; else pending++;
            allTbody.appendChild(createBookingRow(data.id, data, true));
            if(i < 5) recentTbody.appendChild(createBookingRow(data.id, data, false));
        });
        
        document.getElementById('statTotal').innerText = total;
        document.getElementById('statPending').innerText = pending;
        document.getElementById('statCompleted').innerText = completed;
    } catch(e) {
        console.warn("Bookings load error", e);
    }
}

function createBookingRow(id, data, isFull) {
    const tr = document.createElement('tr');
    const badge = data.status === 'Completed' ? 'badge-completed' : 'badge-pending';
    if(isFull) {
        tr.innerHTML = `
            <td data-label="Client"><strong>${data.name}</strong></td>
            <td data-label="Phone">${data.phone}</td>
            <td data-label="Service">${data.serviceName}</td>
            <td data-label="Time">${data.date}<br><small>${data.time}</small></td>
            <td data-label="Pay">${data.paymentMethod}</td>
            <td data-label="Status"><span class="badge ${badge}">${data.status}</span></td>
            <td data-label="Actions">
                ${data.status !== 'Completed' ? `<button class="btn btn-outline" style="padding:0.2rem 0.5rem; font-size:0.8rem;" onclick="markBookingCompleted('${id}')"><i class="fas fa-check"></i> Complete</button>` : ''}
            </td>
        `;
    } else {
        tr.innerHTML = `<td><strong>${data.name}</strong></td><td>${data.serviceName}</td><td>${data.date}</td><td><span class="badge ${badge}">${data.status}</span></td>`;
    }
    return tr;
}

window.markBookingCompleted = async (id) => {
    if(confirm("Complete booking?")) {
        try {
            await deleteDoc(doc(db, "bookings", id));
            showToast("Booking completed!");
            loadBookings();
        } catch(e) {
            showToast("Error updating", true);
        }
    }
};
