/* ============================================================
   LIFE UPGRADE
   COMMON.JS

   Éléments communs à toutes les pages :
   - Header
   - Navigation
   - Menu mobile
   - Footer
   - Navigation active
   - Helpers généraux
============================================================ */


/* ============================================================
   CONFIGURATION GLOBALE
============================================================ */

const LIFE_UPGRADE = {

  name: "Life Upgrade",

  navigation: [

    {
      label: "Accueil",
      href: "index.html",
      id: "home"
    },

    {
      label: "Ma trajectoire",
      href: "trajectoire.html",
      id: "trajectory"
    },

    {
      label: "Développement",
      href: "developpement.html",
      id: "development"
    },

    {
      label: "Études & Orientation",
      href: "etudes.html",
      id: "studies"
    },

    {
      label: "Tests",
      href: "tests.html",
      id: "tests"
    },

    {
      label: "Cours",
      href: "cours.html",
      id: "courses"
    },

    {
      label: "Sessions",
      href: "sessions.html",
      id: "sessions"
    },

    {
      label: "Culture",
      href: "culture.html",
      id: "culture"
    },

    {
      label: "Forum",
      href: "forum.html",
      id: "forum"
    },

    {
      label: "Coaching",
      href: "coaching.html",
      id: "coaching"
    }

  ]

};


/* ============================================================
   DÉTECTION DE LA PAGE ACTUELLE
============================================================ */

function getCurrentPage(){

  const path =
    window.location.pathname
      .split("/")
      .pop()
      .toLowerCase();

  return path || "index.html";

}


function isCurrentPage(href){

  return getCurrentPage() === href.toLowerCase();

}


/* ============================================================
   HEADER
============================================================ */

function buildHeader(){

  const headerTarget =
    document.getElementById(
      "lifeUpgradeHeader"
    );

  if(!headerTarget){
    return;
  }


  const navLinks =
    LIFE_UPGRADE.navigation
      .map(item => {

        const active =
          isCurrentPage(item.href)
          ? "active"
          : "";

        return `

          <a
            href="${item.href}"
            class="${active}"
          >
            ${item.label}
          </a>

        `;

      })
      .join("");


  headerTarget.innerHTML = `

    <header class="header">

      <div class="container nav">

        <a
          class="logo"
          href="index.html"
        >

          <span class="logo-icon">
            LU
          </span>

          <span>
            Life Upgrade
          </span>

        </a>


        <nav
          class="menu"
          id="desktopNavigation"
        >

          ${navLinks}

        </nav>


        <div class="header-actions">

          <a
            class="account-button"
            href="dashboard.html"
          >
            Mon espace
          </a>


          <button
            class="mobile-menu-button"
            id="mobileMenuButton"
            type="button"
            aria-label="Ouvrir le menu"
            aria-expanded="false"
            onclick="toggleMobileMenu()"
          >
            ☰
          </button>

        </div>

      </div>


      <div
        id="mobileNavigation"
        class="mobile-navigation"
      >

        <div class="container">

          ${navLinks}

          <a
            href="dashboard.html"
            class="mobile-account-link"
          >
            Mon espace
          </a>

        </div>

      </div>

    </header>

  `;

}


/* ============================================================
   MENU MOBILE
============================================================ */

function toggleMobileMenu(){

  const navigation =
    document.getElementById(
      "mobileNavigation"
    );

  const button =
    document.getElementById(
      "mobileMenuButton"
    );

  if(!navigation || !button){
    return;
  }


  const open =
    navigation.classList.toggle(
      "open"
    );


  button.setAttribute(
    "aria-expanded",
    open ? "true" : "false"
  );


  button.textContent =
    open ? "×" : "☰";

}


function closeMobileMenu(){

  const navigation =
    document.getElementById(
      "mobileNavigation"
    );

  const button =
    document.getElementById(
      "mobileMenuButton"
    );


  if(!navigation || !button){
    return;
  }


  navigation.classList.remove(
    "open"
  );


  button.setAttribute(
    "aria-expanded",
    "false"
  );


  button.textContent =
    "☰";

}


/* ============================================================
   FOOTER
============================================================ */

function buildFooter(){

  const footerTarget =
    document.getElementById(
      "lifeUpgradeFooter"
    );

  if(!footerTarget){
    return;
  }


  footerTarget.innerHTML = `

    <footer>

      <div class="container footer-grid">


        <div>

          <a
            class="logo"
            href="index.html"
          >

            <span class="logo-icon">
              LU
            </span>

            <span>
              Life Upgrade
            </span>

          </a>


          <p>

            Développement personnel,
            professionnel, études,
            apprentissage et trajectoire.

          </p>

        </div>


        <div>

          <strong>
            Explorer
          </strong>

          <a href="trajectoire.html">
            Ma trajectoire
          </a>

          <a href="developpement.html">
            Développement
          </a>

          <a href="etudes.html">
            Études & Orientation
          </a>

          <a href="tests.html">
            Tests
          </a>

          <a href="cours.html">
            Cours
          </a>

          <a href="sessions.html">
            Sessions
          </a>

        </div>


        <div>

          <strong>
            Communauté
          </strong>

          <a href="culture.html">
            Culture
          </a>

          <a href="forum.html">
            Forum
          </a>

          <a href="coaching.html">
            Coaching
          </a>

          <a href="dashboard.html">
            Mon espace
          </a>

        </div>


        <div>

          <strong>
            Compte
          </strong>

          <a href="inscription.html">
            Créer un compte
          </a>

          <a href="dashboard.html">
            Tableau de bord
          </a>

          <a href="coaching.html">
            Premium
          </a>

        </div>


      </div>


      <div class="container footer-bottom">

        <span>
          © <span id="lifeUpgradeYear"></span>
          Life Upgrade
        </span>

        <span>
          Développement · Apprentissage · Trajectoire
        </span>

      </div>

    </footer>

  `;


  const year =
    document.getElementById(
      "lifeUpgradeYear"
    );


  if(year){

    year.textContent =
      new Date().getFullYear();

  }

}


/* ============================================================
   UTILITAIRES
============================================================ */

function escapeHTML(value){

  return String(value)

    .replaceAll("&","&amp;")

    .replaceAll("<","&lt;")

    .replaceAll(">","&gt;")

    .replaceAll('"',"&quot;")

    .replaceAll("'","&#039;");

}


function formatNumber(value){

  return new Intl.NumberFormat(
    "fr-FR"
  ).format(value);

}


function formatDateFR(date){

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day:"numeric",
      month:"long",
      year:"numeric"
    }
  ).format(date);

}


/* ============================================================
   STORAGE GÉNÉRIQUE
============================================================ */

function lifeUpgradeGetStorage(
  key,
  fallback = null
){

  try{

    const value =
      localStorage.getItem(key);


    if(value === null){
      return fallback;
    }


    return JSON.parse(value);

  }catch(error){

    return fallback;

  }

}


function lifeUpgradeSetStorage(
  key,
  value
){

  try{

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;

  }catch(error){

    return false;

  }

}


/* ============================================================
   INITIALISATION
============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    buildHeader();

    buildFooter();


    document
      .querySelectorAll(
        "#mobileNavigation a"
      )
      .forEach(link => {

        link.addEventListener(
          "click",
          closeMobileMenu
        );

      });

  }
);
