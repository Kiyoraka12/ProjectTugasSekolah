import { initializeApp } from "firebase/app";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  onAuthStateChanged, signOut, sendEmailVerification, updateProfile, 
  updatePassword, updateEmail, sendPasswordResetEmail
} from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, getDocs, where, setDoc, doc } from "firebase/firestore";

// 1. CONFIG FIREBASE
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 2. SELEKTOR HTML AUTH & APLIKASI
const authContainer = document.getElementById('auth-container');
const viewLogin = document.getElementById('view-login');
const viewRegister = document.getElementById('view-register');
const viewVerification = document.getElementById('view-verification');
const viewAplikasi = document.getElementById('view-aplikasi');

const linkKeRegister = document.getElementById('link-ke-register');
const linkKeLogin = document.getElementById('link-ke-login');

const btnAvatar = document.getElementById('btn-avatar');
const navbarUsername = document.getElementById('navbar-username');
const dropdownBox = document.getElementById('dropdown-box');
const subKatalog = document.getElementById('sub-katalog');
const subDetail = document.getElementById('sub-detail');
const subChat = document.getElementById('sub-chat');
const subSettings = document.getElementById('sub-settings');

// Efek Bolak-Balik Halaman Login & Register
if(linkKeRegister) {
  linkKeRegister.addEventListener('click', (e) => {
    e.preventDefault();
    viewLogin.style.display = 'none';
    viewRegister.style.display = 'block';
  });
}
if(linkKeLogin) {
  linkKeLogin.addEventListener('click', (e) => {
    e.preventDefault();
    viewRegister.style.display = 'none';
    viewLogin.style.display = 'block';
  });
}

// 3. STATE APLIKASI CHAT
let userSekarang = null;
let isAdmin = false;
let chatTerpilih = ""; 
let semuaPesanMaster = []; 

// 4. JALUR NAVIGASI UTAMA
function SembunyikanSemuaSub() {
  if(subKatalog) subKatalog.style.display = "none";
  if(subDetail) subDetail.style.display = "none";
  if(subChat) subChat.style.display = "none";
  if(subSettings) subSettings.style.display = "none";
  if(dropdownBox) dropdownBox.classList.remove('tampil');
}

function tampilkanKatalog() { SembunyikanSemuaSub(); if(subKatalog) subKatalog.style.display="block"; }
function tampilkanDetail() { SembunyikanSemuaSub(); if(subDetail) subDetail.style.display="block"; }
function tampilkanChat() { SembunyikanSemuaSub(); if(subChat) subChat.style.display="block"; }
function tampilkanSettings() { SembunyikanSemuaSub(); if(subSettings) subSettings.style.display="block"; }

if(document.getElementById('brand-home')) document.getElementById('brand-home').addEventListener('click', tampilkanKatalog);
if(document.getElementById('drop-katalog')) document.getElementById('drop-katalog').addEventListener('click', tampilkanKatalog);
if(document.getElementById('drop-chat')) document.getElementById('drop-chat').addEventListener('click', tampilkanChat);
if(document.getElementById('drop-settings')) document.getElementById('drop-settings').addEventListener('click', tampilkanSettings);
if(document.getElementById('btn-back-katalog')) document.getElementById('btn-back-katalog').addEventListener('click', tampilkanKatalog);
if(btnAvatar) btnAvatar.addEventListener('click', () => dropdownBox.classList.toggle('tampil'));

// 5. INJECTOR KATALOG KE DETAIL CHAT
document.querySelectorAll('.btn-detail').forEach(tombol => {
  tombol.addEventListener('click', (e) => {
    const { nama, harga, foto, deskripsi } = e.target.dataset;
    document.getElementById('detail-foto').src = foto;
    document.getElementById('detail-nama').innerText = nama;
    document.getElementById('detail-harga').innerText = harga;
    document.getElementById('detail-deskripsi').innerText = deskripsi;
    
    document.getElementById('btn-detail-chat').onclick = () => {
      tampilkanChat();
      if(!isAdmin) {
        document.getElementById('input-pesan-privat').value = `Halo bos, saya tertarik lihat detail ${nama} (${harga}). Unitnya ready?`;
        document.getElementById('input-pesan-privat').focus();
      }
    };
    tampilkanDetail();
  });
});

const pasangPemicuChatKatalog = (idTombol, templateTeks) => {
  const tombol = document.getElementById(idTombol);
  if(tombol) {
    tombol.addEventListener('click', () => {
      tampilkanChat();
      if(!isAdmin) {
        document.getElementById('input-pesan-privat').value = templateTeks;
        document.getElementById('input-pesan-privat').focus();
      }
    });
  }
};
pasangPemicuChatKatalog('btn-porsche-chat', 'Halo bos, unit Porsche 911 GT3 ready?');
pasangPemicuChatKatalog('btn-gtr-chat', 'Halo bos, skema cicilan Nissan GTR R35 gmn?');
pasangPemicuChatKatalog('btn-corvette-chat', 'Halo, Corvette C8 nya bisa nego ga bray?');

// 6. HELPER GENERATOR FOTO PROFIL (PP) REAL-TIME
const renderKomponenAvatar = (urlFoto) => {
  if (urlFoto && urlFoto.trim() !== "") {
    return `<img src="${urlFoto}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; flex-shrink:0; border: 1px solid #ffffff30;" />`;
  }
  return `
    <div style="width:40px; height:40px; background-color:#657786; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>
  `;
};

// 7. ENGINE UTAMA RE-RENDER CHAT WA
function renderAplikasiChatWA() {
  const listKontakBox = document.getElementById('list-kontak-wa') || document.getElementById('daftar-chat');
  const areaPesan = document.getElementById('area-pesan-privat');
  const areaHeaderChat = document.querySelector('.wa-chat-header') || document.getElementById('header-chat-title');
  const labelTipeChat = document.getElementById('label-tipe-chat');

  if (!listKontakBox || !areaPesan) return; 

  if (isAdmin) {
    if (labelTipeChat) labelTipeChat.innerText = "📩 Pesan Masuk User";
    let daftarUserUnik = [...new Set(semuaPesanMaster.map(m => m.roomChannel))].filter(Boolean);
    listKontakBox.innerHTML = "";
    
    if (daftarUserUnik.length === 0) {
      listKontakBox.innerHTML = `<p style="padding:15px; color:#8696a0; font-size:13px;">Belum ada user yang chat.</p>`;
    }
    
    daftarUserUnik.forEach(userEmail => {
      const activeClass = (chatTerpilih === userEmail) ? 'active' : '';
      const filterPesanUser = semuaPesanMaster.filter(m => m.roomChannel === userEmail);
      const lastMsg = filterPesanUser[filterPesanUser.length - 1];
      const msgDariUser = filterPesanUser.filter(m => m.dari === userEmail);
      const lastMsgUser = msgDariUser[msgDariUser.length - 1];
      
      const namaTampil = lastMsgUser?.namaPengirim || userEmail.split('@')[0];
      const fotoTampil = lastMsgUser?.fotoPengirim || "";
      const teksTerakhir = lastMsg?.teks || "Tidak ada pesan baru";

      listKontakBox.innerHTML += `
        <div class="wa-contact ${activeClass}" id="room-${userEmail.replace(/[^a-zA-Z0-9]/g, '')}" style="cursor:pointer; display:flex; align-items:center; padding:10px; border-bottom:1px solid #222;">
          ${renderKomponenAvatar(fotoTampil)}
          <div class="wa-contact-info" style="margin-left:10px;">
            <h4 style="margin:0; font-size:15px; color:#fff;">${namaTampil}</h4>
            <p style="margin:3px 0 0 0; font-size:13px; color:#8696a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${teksTerakhir}</p>
          </div>
        </div>
      `;
    });

    daftarUserUnik.forEach(userEmail => {
      const el = document.getElementById(`room-${userEmail.replace(/[^a-zA-Z0-9]/g, '')}`);
      if (el) { el.onclick = () => { chatTerpilih = userEmail; renderAplikasiChatWA(); }; }
    });

  } else {
    if (labelTipeChat) labelTipeChat.innerText = "Kontak Saya";
    chatTerpilih = userSekarang ? userSekarang.email : "";

    const filterPesanSaya = semuaPesanMaster.filter(m => m.roomChannel === chatTerpilih);
    const lastMsg = filterPesanSaya[filterPesanSaya.length - 1];
    const msgDariAdmin = filterPesanSaya.filter(m => m.dari === 'muhammadazkaazizan11@gmail.com');
    const lastMsgAdmin = msgDariAdmin[msgDariAdmin.length - 1];
    
    const fotoAdmin = lastMsgAdmin?.fotoPengirim || "";
    const teksTerakhir = lastMsg?.teks || "Mulai obrolan dengan admin...";

    listKontakBox.innerHTML = `
      <div class="wa-contact active" style="display:flex; align-items:center; padding:10px;">
        ${renderKomponenAvatar(fotoAdmin)}
        <div class="wa-contact-info" style="margin-left:10px;">
          <h4 style="margin:0; font-size:15px; color:#fff;">Kiyoraka</h4>
          <p style="margin:3px 0 0 0; font-size:13px; color:#8696a0;">${teksTerakhir}</p>
        </div>
      </div>
    `;
  }

  if (chatTerpilih === "") {
    if (areaHeaderChat) {
      areaHeaderChat.innerHTML = `
        <div style="display:flex; align-items:center; padding:10px 16px; background-color:#202c33; width:100%;">
          <button id="btn-back-chat" style="display: none; background: none; border: none; color: white; font-size: 22px; cursor: pointer; margin-right: 15px;">←</button>
          
          ${renderKomponenAvatar("")}
          <div style="margin-left:15px;">
            <span style="font-weight:bold; color:#fff; display:block; font-size:15px;">Memuat Obrolan sabar jir</span>
            <span style="font-size:12px; color:#8696a0;">Menghubungkan ke server...</span>
          </div>
        </div>
      `;
    }
    areaPesan.innerHTML = `<div style="text-align:center; color:#8696a0; margin-top:30px; font-size:14px;">Klik salah satu kontak di kiri buat mulai chat bray.</div>`;
    return;
  }

  let namaHeader = "Kiyoraka";
  let fotoHeader = "";
  const pesanKamarTerpilih = semuaPesanMaster.filter(msg => msg.roomChannel === chatTerpilih);

  if (isAdmin) {
    const pesanDariUser = pesanKamarTerpilih.filter(m => m.dari === chatTerpilih);
    const lastMsg = pesanDariUser[pesanDariUser.length - 1];
    namaHeader = lastMsg?.namaPengirim || chatTerpilih.split('@')[0];
    fotoHeader = lastMsg?.fotoPengirim || "";
  } else {
    const pesanDariAdmin = pesanKamarTerpilih.filter(m => m.dari === 'muhammadazkaazizan11@gmail.com');
    const lastMsg = pesanDariAdmin[pesanDariAdmin.length - 1];
    fotoHeader = lastMsg?.fotoPengirim || "";
  }

  if (areaHeaderChat) {
    areaHeaderChat.innerHTML = `
      <div style="display:flex; align-items:center; padding:10px 16px; background-color:#202c33; width:100%;">
        <button id="btn-back-chat" style="display: none; background: none; border: none; color: white; font-size: 22px; cursor: pointer; margin-right: 15px;">←</button>
        
        ${renderKomponenAvatar(fotoHeader)}
        <div style="margin-left:15px;">
          <span style="font-weight:bold; color:#fff; display:block; font-size:15px;">${namaHeader}</span>
          <span style="font-size:12px; color:#00a884;">Online (Siap Membantu)</span>
        </div>
      </div>
    `;
  }

  areaPesan.innerHTML = "";
  const waktuSekarangMS = new Date().getTime();
  const batasSatuHariMS = 24 * 60 * 60 * 1000; 

  pesanKamarTerpilih.forEach(data => {
    let waktuPesanMS = waktuSekarangMS;
    if (data.waktu && data.waktu.seconds) {
      waktuPesanMS = data.waktu.seconds * 1000;
    } else if (data.waktu) {
      waktuPesanMS = new Date(data.waktu).getTime();
    }

    if (waktuSekarangMS - waktuPesanMS > batasSatuHariMS) return; 

    const isMe = data.dari === (userSekarang ? userSekarang.email : "");
    const posisiBubble = isMe ? 'right' : 'left';
    const warnaBubble = isMe ? 'wa-message sent' : 'wa-message received';
    
    let formatJam = "12:00";
    if (data.waktu && data.waktu.seconds) {
      const d = new Date(data.waktu.seconds * 1000);
      formatJam = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }

    areaPesan.innerHTML += `
      <div class="wa-msg-wrapper ${posisiBubble}" style="display:flex; justify-content:${isMe ? 'flex-end' : 'flex-start'}; margin-bottom:8px; padding: 0 10px;">
        <div class="${warnaBubble}" style="max-width:60%; padding:8px 12px; border-radius:8px; color:#fff; background-color:${isMe ? '#00a884' : '#202c33'};">
           <div style="font-size:14px; word-break:break-word;">${data.teks}</div>
           <div style="font-size:10px; color:rgba(255,255,255,0.5); text-align:right; margin-top:4px;">${formatJam} ✓✓</div>
        </div>
      </div>
    `;
  });

  areaPesan.scrollTop = areaPesan.scrollHeight;
}

/// 8. REALTIME SYNC DATA & AUTH CONTROL
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    userSekarang = user;
    isAdmin = (user.email === 'muhammadazkaazizan11@gmail.com');
    
    if(authContainer) authContainer.style.display = 'none';
    if(viewAplikasi) viewAplikasi.style.display = 'block';
    
    if(user.photoURL && btnAvatar) btnAvatar.src = user.photoURL;
      
      // TAMPILIN NAMA DI NAVBAR
      if(navbarUsername) {
        navbarUsername.innerText = user.displayName || user.email.split('@')[0];
      }

    const q = query(collection(db, "pesan_privat"), orderBy("waktu", "asc"));
    onSnapshot(q, (snapshot) => {
      semuaPesanMaster = [];
      snapshot.forEach((docSnap) => { semuaPesanMaster.push(docSnap.data()); });
      renderAplikasiChatWA();
    });
  } else {
    if(authContainer) authContainer.style.display = 'block';
    if(viewAplikasi) viewAplikasi.style.display = 'none';
    
    if (viewLogin.style.display !== 'block' && viewRegister.style.display !== 'block' && viewVerification.style.display !== 'block') {
      viewLogin.style.display = 'block';
      viewRegister.style.display = 'none';
      viewVerification.style.display = 'none';
    }
  }
});

// 9. EVENT TOMBOL KIRIM CHAT
const btnKirim = document.getElementById('btn-kirim-privat');
if (btnKirim) {
  btnKirim.addEventListener('click', async () => {
    const inputTeks = document.getElementById('input-pesan-privat');
    if (inputTeks && inputTeks.value.trim() !== "" && userSekarang && chatTerpilih !== "") {
      await addDoc(collection(db, "pesan_privat"), {
        roomChannel: chatTerpilih,          
        dari: userSekarang.email,          
        teks: inputTeks.value,
        waktu: new Date(),
        namaPengirim: userSekarang.displayName || userSekarang.email.split('@')[0],
        fotoPengirim: userSekarang.photoURL || ""
      });
      inputTeks.value = "";
    }
  });
}

const inputPesan = document.getElementById('input-pesan-privat');
if (inputPesan) {
  inputPesan.addEventListener('keypress', (e) => {
    if(e.key === 'Enter' && btnKirim) btnKirim.click();
  });
}

// 10. FITUR PENGATURAN USERNAME/PP
const btnSaveUsername = document.getElementById('btn-save-username');
if (btnSaveUsername) {
  btnSaveUsername.addEventListener('click', () => {
    const namaBaru = document.getElementById('set-new-username');
    if(namaBaru && namaBaru.value.trim() !== "") {
      updateProfile(auth.currentUser, { displayName: namaBaru.value.trim() }).then(() => {
        alert("Username berhasil diupdate bray!");
        if(navbarUsername) navbarUsername.innerText = namaBaru.value.trim();
        renderAplikasiChatWA();
      });
    }
  });
}

// 11. SISTEM REGISTER & DETEKSI OTOMATIS VERIFIKASI
let intervalVerif = null; 

const tombolDaftar = document.getElementById('tombol-daftar');
if(tombolDaftar) {
  tombolDaftar.addEventListener('click', async () => {
    const regUsername = document.getElementById('reg-username').value.trim();
    const regEmail = document.getElementById('reg-email').value.trim();
    const regPass = document.getElementById('reg-pass').value.trim();

    if(regUsername === "" || regEmail === "" || regPass === "") {
      alert("Isi semua kolom pendaftaran bray!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPass);
      const userBaru = userCredential.user;
      await updateProfile(userBaru, { displayName: regUsername });
      await setDoc(doc(db, "users_account", userBaru.uid), {
        username: regUsername.toLowerCase(),
        email: regEmail.toLowerCase()
      });
      await sendEmailVerification(userBaru);
      
      viewRegister.style.display = 'none';
      viewVerification.style.display = 'block';

      intervalVerif = setInterval(async () => {
        if (auth.currentUser) {
          await auth.currentUser.reload(); 
          if (auth.currentUser.emailVerified) {
            clearInterval(intervalVerif); 
            alert("✓ Email sukses terverifikasi otomatis bray! Mengalihkan ke halaman login...");
            await signOut(auth); 
            viewVerification.style.display = 'none';
            viewLogin.style.display = 'block';
          }
        }
      }, 3000);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        alert("Email ini udah terdaftar bro! nih gw pindahin ke halaman Login ye.");
        if(viewRegister) viewRegister.style.display = 'none';
        if(viewVerification) viewVerification.style.display = 'none';
        if(viewLogin) viewLogin.style.display = 'block';
      } else {
        alert("Gagal Daftar: " + e.message);
      }
    }
  });
}

if(document.getElementById('btn-batal-verif')) {
  document.getElementById('btn-batal-verif').addEventListener('click', async () => {
    if(intervalVerif) clearInterval(intervalVerif);
    await signOut(auth);
    viewVerification.style.display = 'none';
    viewLogin.style.display = 'block';
  });
}

const tombolLogin = document.getElementById('tombol-login');
if(tombolLogin) {
  tombolLogin.addEventListener('click', async () => {
    const loginId = document.getElementById('login-id').value.trim();
    const loginPass = document.getElementById('login-pass').value.trim();

    if(loginId === "" || loginPass === "") {
      alert("⚠️ Isi Username/Email sama Passwordnya dulu bray!");
      return;
    }

    let emailTarget = loginId;
    const teksAsli = tombolLogin.innerText;
    tombolLogin.innerText = "Mengecek data...";
    tombolLogin.disabled = true;

    try {
      if (!loginId.includes('@')) {
        const qUser = query(collection(db, "users_account"), where("username", "==", loginId.toLowerCase()));
        const snapUser = await getDocs(qUser);
        
        if (snapUser.empty) {
          alert(`❌ Username '${loginId}' tidak ditemukan bray! Cek lagi typo-nya atau daftar baru.`);
          tombolLogin.innerText = teksAsli;
          tombolLogin.disabled = false;
          return;
        }
        emailTarget = snapUser.docs[0].data().email;
      }

      const uc = await signInWithEmailAndPassword(auth, emailTarget, loginPass);
      
      if (!uc.user.emailVerified) {
        alert("⚠️ Waduh, akun lu belom diverifikasi nih! Silakan cek inbox/spam email lu trus klik linknya.");
        await signOut(auth);
      } else {
        document.getElementById('login-id').value = "";
        document.getElementById('login-pass').value = "";
      }
    } catch (e) {
      console.log("Kode Error Firebase:", e.code);
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        alert("Password Salah.");
      } else if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email') {
        alert("Email ini belum terdaftar atau formatnya salah!");
      } else if (e.code === 'auth/too-many-requests') {
        alert("Jangan Terlalu sering masukin password salah. Sistem dikunci sementara, tunggu beberapa menit ya!");
      } else {
        alert("Gagal Login: " + e.message);
      }
    }
    tombolLogin.innerText = teksAsli;
    tombolLogin.disabled = false;
  });
}

if(document.getElementById('link-forgot')) {
  document.getElementById('link-forgot').addEventListener('click', (e) => {
    e.preventDefault();
    const emailLogin = document.getElementById('login-id').value.trim();
    if(!emailLogin.includes('@')) {
      alert("Ketik ALAMAT EMAIL kamu di kolom atas dulu, trus klik Lupa Password lagi.");
    } else {
      sendPasswordResetEmail(auth, emailLogin).then(() => {
        alert("Link reset password sudah dikirim ke email kamu!");
      }).catch(e => alert("Error: " + e.message));
    }
  });
}

const btnLogout = document.getElementById('tombol-logout');
if(btnLogout) btnLogout.addEventListener('click', () => signOut(auth));

// ==========================================
// 12. LOGIKA TAMPILAN RESPONSIVE & TOMBOL BACK CHAT (PERBAIKAN FINAL)
// ==========================================

// a. Tangkap klik tombol back dimana aja (Event Delegation anti-badai)
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'btn-back-chat') {
    const waChatArea = document.querySelector('.wa-chat-area');
    const waSidebar = document.querySelector('.wa-sidebar');
    if (waChatArea) waChatArea.style.display = 'none';
    if (waSidebar) waSidebar.style.display = 'flex';
  }
});

// b. Buka obrolan cuma pas klik area .wa-contact yang spesifik
const listKontakWAGlobal = document.getElementById('list-kontak-wa'); 
if (listKontakWAGlobal) {
  listKontakWAGlobal.addEventListener('click', (e) => {
    // Cari elemen terdekat yang class-nya 'wa-contact' (kontak orangnya beneran)
    const kontakYgDiklik = e.target.closest('.wa-contact');
    if (kontakYgDiklik) { 
      const waChatArea = document.querySelector('.wa-chat-area');
      const waSidebar = document.querySelector('.wa-sidebar');
      if (window.innerWidth <= 768) {
        if (waSidebar) waSidebar.style.display = 'none';
        if (waChatArea) waChatArea.style.display = 'flex';
      }
    }
  });
}

// c. Anti bug layar mental pas keyboard HP muncul
let lebarLayarAwal = window.innerWidth;
window.addEventListener('resize', () => {
  // Kalo lebar layar gak berubah (cuma tinggi doang karena keyboard), cuekin aja
  if (window.innerWidth === lebarLayarAwal) return; 
  
  lebarLayarAwal = window.innerWidth;
  const waChatArea = document.querySelector('.wa-chat-area');
  const waSidebar = document.querySelector('.wa-sidebar');
  
  if (window.innerWidth > 768) {
    if(waSidebar) waSidebar.style.display = 'flex';
    if(waChatArea) waChatArea.style.display = 'flex';
  } else {
    // Mode HP default-nya nutup obrolan nampilin daftar chat
    if(waSidebar) waSidebar.style.display = 'flex';
    if(waChatArea) waChatArea.style.display = 'none';
  }
});