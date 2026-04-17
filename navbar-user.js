// ============================================================
//  navbar-user.js
//  Drop this ONE script into every student page with:
//  <script src="navbar-user.js" defer></script>
//
//  It reads sessionStorage (saved during login) and updates:
//    - Avatar initials bubble
//    - Dropdown name
//    - Dropdown section (grade + strand)
//    - Restores saved profile photo
//    - Avatar photo upload
//    - Dropdown open/close toggle
//    - Dark mode toggle
//    - Logout button
// ============================================================

(function () {

  // ── 1. REDIRECT IF NOT LOGGED IN OR WRONG ROLE ──────────────
  const _uid  = sessionStorage.getItem("userId");
  const _role = sessionStorage.getItem("userRole");
  if (!_uid || _role !== "student") {
    sessionStorage.clear();
    window.location.href = "index.html";
    return;
  }

  // ── 2. READ SESSION ──────────────────────────────────────────
  const userName   = sessionStorage.getItem("userName")   || "Student";
  const userGrade  = sessionStorage.getItem("userGrade")  || "";
  const userStrand = sessionStorage.getItem("userStrand") || "";
  const userId     = sessionStorage.getItem("userId");

  // "Grade 11 · STEM"  or just grade, or just strand, or "Student"
  const sectionLabel = [userGrade, userStrand].filter(Boolean).join(" · ") || "Student";

  // First letter of name as initials
  const initials = userName.trim().charAt(0).toUpperCase();

  // ── 3. UPDATE ALL INITIALS BUBBLES ──────────────────────────
  function setInitials() {
    document.querySelectorAll(
      "#navInitials, #dropInitials, .nav-avatar-initials"
    ).forEach(el => {
      el.textContent = initials;
    });
  }

  // ── 4. UPDATE DROPDOWN NAME & SECTION ───────────────────────
  function setDropdownInfo() {
    const dropName    = document.getElementById("dropName");
    const dropSection = document.getElementById("dropSection");
    if (dropName)    dropName.textContent    = userName;
    if (dropSection) dropSection.textContent = sectionLabel;
  }

  // ── 5. RESTORE SAVED PROFILE PHOTO ──────────────────────────
  function restorePhoto() {
    const saved = localStorage.getItem("avatarPhoto_" + userId);
    if (!saved) return;

    document.querySelectorAll(
      ".nav-avatar-photo, .dropdown-avatar-photo"
    ).forEach(img => {
      img.src           = saved;
      img.style.display = "block";
      img.classList.add("has-photo");
    });

    document.querySelectorAll(
      ".nav-avatar-initials, #navInitials, #dropInitials"
    ).forEach(el => {
      el.style.display = "none";
    });
  }

  // ── 6. AVATAR PHOTO UPLOAD ───────────────────────────────────
  function bindAvatarUpload() {
    const input = document.getElementById("avatarFileInput");
    if (!input) return;

    input.addEventListener("change", function () {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        const dataUrl = e.target.result;
        localStorage.setItem("avatarPhoto_" + userId, dataUrl);

        document.querySelectorAll(
          ".nav-avatar-photo, .dropdown-avatar-photo"
        ).forEach(img => {
          img.src           = dataUrl;
          img.style.display = "block";
          img.classList.add("has-photo");
        });

        document.querySelectorAll(
          ".nav-avatar-initials, #navInitials, #dropInitials"
        ).forEach(el => {
          el.style.display = "none";
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // ── 7. DROPDOWN TOGGLE ───────────────────────────────────────
  function bindDropdown() {
    const wrapper  = document.getElementById("avatarBtn");
    const dropdown = document.getElementById("dropdownMenu");
    if (!wrapper || !dropdown) return;

    wrapper.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle("show");
      wrapper.classList.toggle("open", isOpen);
      wrapper.setAttribute("aria-expanded", isOpen);
    });

    document.addEventListener("click", () => {
      dropdown.classList.remove("show");
      wrapper.classList.remove("open");
      wrapper.setAttribute("aria-expanded", "false");
    });
  }

  // ── 8. DARK MODE ─────────────────────────────────────────────
  function bindDarkMode() {
    const toggle = document.getElementById("themeToggle");
    const saved  = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    if (toggle) {
      toggle.checked = saved === "dark";
      toggle.addEventListener("change", function () {
        const theme = this.checked ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
      });
    }
  }

  // ── 9. LOGOUT ────────────────────────────────────────────────
  function bindLogout() {
    const btn = document.getElementById("dropdownLogout");
    if (!btn) return;
    btn.addEventListener("click", () => {
      sessionStorage.clear();
      window.location.href = "index.html";
    });
  }

  // ── 10. INIT (run after DOM is ready) ────────────────────────
  function init() {
    setInitials();
    setDropdownInfo();
    restorePhoto();
    bindAvatarUpload();
    bindDropdown();
    bindDarkMode();
    bindLogout();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();