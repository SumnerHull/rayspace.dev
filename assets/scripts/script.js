/*!
  Modern script.js v2.0
  (c) 2024 rx0a
 */

let isPageFirstLoaded = true;
const root = "https://rayspace.dev";
const navLinks = document.querySelectorAll(".nav-menu .nav-link");

let postsCache = null;
let postsCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000;

async function fetchPostsWithCache() {
  const now = Date.now();
  if (postsCache && postsCacheTime && (now - postsCacheTime) < CACHE_DURATION) {
    return postsCache;
  }
  
  const response = await fetch("/api/posts");
  if (!response.ok) throw new Error("Failed to fetch posts");
  
  postsCache = await response.json();
  postsCacheTime = now;
  return postsCache;
}

async function fetchTotalViews() {
  try {
    const posts = await fetchPostsWithCache();
    const totalViews = posts.reduce((sum, post) => sum + post.views, 0);
    const element = document.querySelector("#blogViewsCount");
    if (element) {
      element.textContent = `${totalViews.toLocaleString()} blog views all time`;
    }
  } catch (error) {
    console.error(error);
  }
}

// Fetch recent signee for guestbook
async function fetchRecentSignee() {
  try {
    const response = await fetch("/api/comments");
    if (!response.ok) throw new Error("Failed to fetch recent signee.");
    const comments = await response.json();
    comments.sort((a, b) => b.id - a.id);
    const recentName = comments[0].name;
    const element = document.querySelector("#recentSignee");
    if (element) {
      element.textContent = `Recent signee: ${recentName}`;
    }
  } catch (error) {
    console.error(error);
  }
}

// Fetch GitHub stars
async function fetchGithubStars() {
  try {
    const response = await fetch("/api/github_stars");
    if (!response.ok) throw new Error("Failed to fetch Github stars.");
    const data = await response.json();
    const stars = data.stars;
    const element = document.querySelector("#githubStars");
    if (element) {
      element.textContent = stars > 0 ? `${stars} stars on this repo` : "View this repo";
    }
  } catch (error) {
    console.error(error);
    const element = document.querySelector("#githubStars");
    if (element) {
      element.textContent = "View this repo";
    }
  }
}

// Handle comment submission
async function handleSubmit(event) {
  event.preventDefault();
  let commentInput = document.getElementById("comment-input");
  let comment = commentInput.value.trim();
  
  if (comment !== "") {
    comment = DOMPurify.sanitize(comment);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment: comment }),
      });
      if (!response.ok) throw new Error("Failed to submit comment.");
      await response.json();
      fetchGuestbookComments();
      commentInput.value = "";
    } catch (error) {
      console.error(error);
    }
  }
}

// Fetch user authentication status
async function fetchUserStatus() {
  const response = await fetch("/api/user_status");
  if (response.ok) {
    return await response.json();
  }
  console.error("Failed to fetch user status.");
  return null;
}

// Handle logout
async function logout() {
  const response = await fetch("/auth/logout", { method: "POST" });
  if (response.ok) {
    document.querySelector(".sign-out-button").classList.add("hidden");
    document.querySelector(".input-container").classList.add("hidden");
    document.querySelector(".github-signin").classList.remove("hidden");
  } else {
    console.error("Failed to log out.");
  }
}

// Fetch metadata and set active link
async function fetchMetadataAndSetActiveLink(path) {
  const posts = await fetchPostsWithCache();
  let activeLink;
  
  const blogPaths = posts.map(post => `/blog/${convertToDashed(post.title)}`);
  
  if (blogPaths.includes(path)) {
    activeLink = document.querySelector('.nav-menu .nav-link[href="/blog"]');
  } else {
    activeLink = document.querySelector(`.nav-menu .nav-link[href="${path}"]`);
  }
  
  if (activeLink) {
    activeLink.classList.add("active");
    loadPage(path);
  }
  
  isPageFirstLoaded = false;
}

// Get current URL
function getCurrentUrl() {
  const path = window.location.pathname;
  return path === "/" ? "/home" : path;
}

// Load page content
async function loadPage(path) {
  try {
    const currentPath = path || window.location.pathname;
    
    if (currentPath.startsWith("/blog")) {
      const posts = await fetchPostsWithCache();
      const blogPaths = posts.map(post => `/blog/${convertToDashed(post.title)}`);
      
      if (blogPaths.includes(currentPath)) {
        const postIndex = blogPaths.indexOf(currentPath);
        const postId = posts[postIndex].id;
        const postResponse = await fetch(`/posts/${postId}.html`);
        
        if (!postResponse.ok) throw new Error("Failed to fetch post HTML");
        
        const postHtml = await postResponse.text();
        document.querySelector(".main-content").innerHTML = postHtml;
        hljs.highlightAll();
        fetchMetadata();
        updateViews(posts[postIndex].id);
      } else {
        loadPageContent(currentPath);
      }
    } else {
      loadPageContent(currentPath);
    }
  } catch (error) {
    console.error(error);
  }
}

// Fetch guestbook comments
async function fetchGuestbookComments() {
  try {
    const response = await fetch("/api/comments");
    if (!response.ok) throw new Error("Failed to fetch guestbook comments");
    
    const comments = await response.json();
    if (Array.isArray(comments)) {
      displayComments(comments);
    }
  } catch (error) {
    console.error(error);
  }
}

// Display comments
function displayComments(comments) {
  const commentsContainer = document.querySelector(".guestbook-comments");
  if (!commentsContainer) return;
  
  commentsContainer.innerHTML = "";
  
  [...comments].forEach(comment => {
    const commentElement = document.createElement("div");
    commentElement.classList.add("comment");
    
    const nameElement = document.createElement("div");
    nameElement.classList.add("comment-name");
    nameElement.textContent = `${comment.name}: `;
    
    const messageElement = document.createElement("div");
    messageElement.classList.add("comment-message");
    messageElement.textContent = comment.comment;
    
    commentElement.appendChild(nameElement);
    commentElement.appendChild(messageElement);
    commentsContainer.appendChild(commentElement);
  });
}

// Update post views
async function updateViews(postId) {
  try {
    const response = await fetch(`/api/update_views/${postId}`, { method: "PUT" });
    if (!response.ok) throw new Error(`Failed to update views for post ID: ${postId}`);
  } catch (error) {
    console.error(error);
  }
}

// Load page content from HTML files
function loadPageContent(path) {
  const pageMap = {
    "/": "./pages/home.html",
    "/home": "./pages/home.html",
    "/about": "./pages/about.html",
    "/guestbook": "./pages/guestbook.html",
    "/blog": "./pages/blog.html",
    "/resume": "./pages/resume.html",
    "/tools": "./pages/tools.html",
    "/404": "./pages/404.html"
  };
  
  const pagePath = pageMap[path];
  
  if (pagePath) {
    fetch(pagePath)
      .then(response => response.text())
      .then(html => {
        document.querySelector(".main-content").innerHTML = html;
        
        // Handle 404 page random blockquote
        if (path === "/404") {
          const blockquotes = document.querySelectorAll("blockquote");
          const randomIndex = Math.floor(Math.random() * blockquotes.length);
          blockquotes.forEach((bq, index) => {
            bq.style.display = index === randomIndex ? "block" : "none";
          });
        }
        
        // Update meta title
        updateMetaTitle(capitalize(path.replace("/", "")));
        
        // Handle blog links
        if (path === "/blog") {
          document.querySelectorAll(".post-link").forEach(link => {
            link.addEventListener("click", handleBlogLinkClick);
          });
        }
        
        // Handle home links
        document.querySelectorAll(".home-link").forEach(link => {
          link.addEventListener("click", (e) => {
            e.preventDefault();
            const navLink = document.querySelector(`.nav-link[href="${link.getAttribute("href")}"]`);
            if (navLink) navLink.click();
          });
        });
        
        // Handle about page resume link
        if (path === "/about") {
          document.querySelector(".main-content").innerHTML = html;
          let resumeLink = document.querySelector(".resume-link");
          if (resumeLink) {
            resumeLink.addEventListener("click", (e) => {
              e.preventDefault();
              loadPage("/resume");
              const href = resumeLink.getAttribute("href");
              history.pushState(null, null, href);
            });
          }
        }
        
        // Handle home page stats
        if (path === "/home" || path === "/") {
          fetchGithubStars();
          fetchTotalViews();
          fetchRecentSignee();
        }
        
        // Handle guestbook page
        if (path === "/guestbook") {
          const inputContainer = document.querySelector(".input-container");
          const signOutButton = document.querySelector(".sign-out-button");
          const githubSignin = document.querySelector(".github-signin");
          
          fetchUserStatus().then(userStatus => {
            if (userStatus.authenticated) {
              inputContainer.classList.remove("hidden");
              signOutButton.classList.remove("hidden");
              githubSignin.classList.add("hidden");
              
              let commentForm = document.getElementById("comment-form");
              if (commentForm) {
                commentForm.addEventListener("submit", handleSubmit);
              }
            } else {
              inputContainer.classList.add("hidden");
              signOutButton.classList.add("hidden");
              githubSignin.classList.remove("hidden");
            }
          });
          
          fetchGuestbookComments();
        }
        
        // Handle blog metadata
        if (path === "/blog") {
          fetchMetadata();
        }
      })
      .catch(error => {
        console.error(error);
      });
  } else {
    window.location.href = "/404";
  }
}

// Handle blog link clicks
function handleBlogLinkClick(event) {
  event.preventDefault();
  const href = this.getAttribute("href");
  history.pushState(null, null, href);
  loadPage(href);
}

// Handle GitHub sign in
function handleGithubSignIn(event) {
  event.preventDefault();
  window.location.href = "/auth/start_github_oauth";
}

// Convert title to dashed format
function convertToDashed(title) {
  return title.toLowerCase().replace(/\s+/g, "-");
}

// Capitalize first letter
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Update meta title
function updateMetaTitle(title) {
  const titleElement = document.querySelector("title");
  const siteName = "Ray Space";
  const siteUrl = root;
  
  titleElement.text = title !== "Home" ? `${title} | Ray Space` : siteName;
  updateOGTags(siteName, "Full-Stack Software Engineer", siteUrl, "website");
}

// Update Open Graph tags
function updateOGTags(title, description, url, type) {
  const metaElements = {
    'meta[name="description"]': description,
    'meta[property="og:title"]': title,
    'meta[property="og:description"]': description,
    'meta[property="og:url"]': url,
    'meta[property="og:type"]': type,
    'meta[name="twitter:title"]': title,
    'meta[name="twitter:description"]': description
  };
  
  Object.entries(metaElements).forEach(([selector, content]) => {
    const element = document.querySelector(selector);
    if (element) {
      element.setAttribute("content", content);
    }
  });
}

// Copy code to clipboard
function copyToClipboard() {
  const codeElement = document.getElementById("code");
  if (!codeElement) return false;
  
  const textarea = document.createElement("textarea");
  textarea.textContent = codeElement.textContent;
  textarea.style.position = "fixed";
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand("copy");
  } catch (err) {
    return false;
  } finally {
    document.body.removeChild(textarea);
    
    const copyIcon = document.getElementById("copy-icon");
    const checkmarkIcon = document.getElementById("checkmark-icon");
    
    if (copyIcon) copyIcon.style.opacity = "0";
    if (checkmarkIcon) checkmarkIcon.style.opacity = "1";
    
    setTimeout(function() {
      if (copyIcon) copyIcon.style.opacity = "1";
      if (checkmarkIcon) checkmarkIcon.style.opacity = "0";
    }, 2000);
  }
}

// Fetch metadata for blog posts
async function fetchMetadata() {
  try {
    const posts = await fetchPostsWithCache();
    posts.sort((a, b) => a.id - b.id);
    
    const titles = posts.map(post => post.title);
    const blogPaths = titles.map(title => `/blog/${convertToDashed(title)}`);
    const currentUrl = getCurrentUrl();
    
    if (currentUrl === "/blog") {
      const postsContainer = document.querySelector(".posts");
      if (postsContainer) {
        postsContainer.innerHTML = "";
        
        posts.forEach((post, index) => {
          const postElement = document.createElement("div");
          postElement.classList.add("post-list-item");
          
          const titleElement = document.createElement("div");
          titleElement.classList.add("post-link");
          titleElement.textContent = post.title;
          
          const viewsElement = document.createElement("div");
          viewsElement.classList.add("post-views");
          viewsElement.textContent = `${post.views.toLocaleString()} views`;
          
          postElement.appendChild(titleElement);
          postElement.appendChild(viewsElement);
          postElement.href = blogPaths[index];
          postElement.addEventListener("click", handleBlogLinkClick);
          
          postsContainer.appendChild(postElement);
        });
      }
    } else if (blogPaths.includes(currentUrl)) {
      const postIndex = blogPaths.indexOf(currentUrl);
      const title = titles[postIndex];
      
      // Update post title
      document.querySelectorAll(".post-title").forEach(element => {
        element.textContent = title;
      });
      
      // Create post info container
      const infoContainer = document.createElement("div");
      infoContainer.classList.add("post-info-container");
      
      const dateElement = document.createElement("span");
      dateElement.classList.add("post-date");
      dateElement.textContent = posts[postIndex].published_date;
      
      const viewsElement = document.createElement("span");
      viewsElement.classList.add("post-views");
      viewsElement.textContent = `${posts[postIndex].views.toLocaleString()} views`;
      
      infoContainer.appendChild(dateElement);
      infoContainer.appendChild(viewsElement);
      
      // Insert after post title
      const postTitle = document.querySelector(".post-title");
      if (postTitle && postTitle.parentNode) {
        postTitle.parentNode.insertBefore(infoContainer, postTitle.nextSibling);
      }
      
      updateMetaTitle(title);
      
      // Update OG tags for article
      const firstParagraph = document.getElementById("content").getElementsByTagName("p")[0];
      if (firstParagraph) {
        const description = firstParagraph.textContent;
        updateOGTags(title, description, root + currentUrl, "article");
      }
    }
  } catch (error) {
    console.error(`Fetch operation failed: ${error.message}`);
  }
}

// Initialize page on load
window.onload = () => {
  const currentUrl = getCurrentUrl();
  
  if (currentUrl.startsWith("/blog")) {
    fetchMetadataAndSetActiveLink(currentUrl);
  } else {
    let activeLink;
    
    if (currentUrl === "/resume") {
      activeLink = document.querySelector('.nav-menu .nav-link[href="/about"]');
    } else {
      activeLink = document.querySelector(`.nav-menu .nav-link[href="${currentUrl}"]`);
    }
    
    if (activeLink) {
      activeLink.classList.add("active");
      loadPage(currentUrl);
    }
    
    isPageFirstLoaded = false;
  }
};

// Handle browser back/forward
window.addEventListener("popstate", () => {
  const currentUrl = getCurrentUrl();
  
  navLinks.forEach(link => link.classList.remove("active"));
  
  if (currentUrl.startsWith("/blog")) {
    fetchMetadataAndSetActiveLink(currentUrl);
  } else {
    let activeLink;
    
    if (currentUrl === "/resume") {
      activeLink = document.querySelector('.nav-menu .nav-link[href="/about"]');
    } else {
      activeLink = document.querySelector(`.nav-menu .nav-link[href="${currentUrl}"]`);
    }
    
    if (activeLink) {
      activeLink.classList.add("active");
      loadPage(currentUrl);
    }
  }
});

// Handle navigation link clicks
navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navLinks.forEach(l => l.classList.remove("active"));
    link.classList.add("active");
    
    const href = link.getAttribute("href");
    history.pushState(null, null, href);
    
    if (href === "/home") {
      history.replaceState(null, null, "/");
    }
    
    loadPage(href);
  });
});

// Mobile menu toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuToggle && navMenu) {
  mobileMenuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('mobile-open');
    mobileMenuToggle.classList.toggle('active');
  });
}
