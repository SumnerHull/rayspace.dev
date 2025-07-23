let tinymceEditor = null;
let currentEditingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthStatus();
    setupEventListeners();
});

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user_status');
        const data = await response.json();
        
        if (data.authenticated && data.is_admin) {
            showAdminInterface(data.user_name);
        } else if (data.authenticated) {
            showUnauthorized();
        } else {
            showLoginSection();
        }
    } catch (error) {
        console.error('Failed to check auth status:', error);
        showLoginSection();
    }
}

function showAdminInterface(userName) {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('unauthorized').classList.add('hidden');
    document.getElementById('admin-interface').classList.remove('hidden');
    document.getElementById('auth-status').classList.remove('hidden');
    document.getElementById('user-name').textContent = `Welcome, ${userName}`;
}

function showUnauthorized() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('admin-interface').classList.add('hidden');
    document.getElementById('unauthorized').classList.remove('hidden');
    document.getElementById('auth-status').classList.remove('hidden');
}

function showLoginSection() {
    document.getElementById('admin-interface').classList.add('hidden');
    document.getElementById('unauthorized').classList.add('hidden');
    document.getElementById('auth-status').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
}

function setupEventListeners() {
    document.getElementById('create-post-btn').addEventListener('click', showCreateForm);
    document.getElementById('manage-posts-btn').addEventListener('click', loadPostsList);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

async function verifyAuthBeforeSubmit() {
    try {
        const response = await fetch('/api/user_status');
        const data = await response.json();
        
        if (!data.authenticated || !data.is_admin) {
            alert('You are not authenticated as an admin. Please log in again.');
            window.location.reload();
            return false;
        }
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        alert('Authentication check failed. Please try again.');
        return false;
    }
}

async function initTinyMCE() {
    if (typeof tinymce === 'undefined') {
        console.error('TinyMCE not loaded');
        return;
    }

    if (tinymceEditor) {
        tinymce.remove('#post-content');
    }

    tinymce.init({
        selector: '#post-content',
        apiKey: '0e79us8oed499gm4n5zqxqet78r54d9cpf5sprqlfsr2ff4f',
        height: 400,
        menubar: false,
        plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
        content_style: 'body { font-family: Inter, sans-serif; font-size: 16px; }',
        setup: function(editor) {
            tinymceEditor = editor;
        }
    });
}

function showCreateForm() {
    document.getElementById('post-form').classList.remove('hidden');
    document.getElementById('posts-list').classList.add('hidden');
    document.getElementById('form-title').textContent = 'Create New Post';
    document.getElementById('admin-post-form').reset();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('post-date').value = today;
    
    currentEditingId = null;
    initTinyMCE();
    
    const form = document.getElementById('admin-post-form');
    const cancelBtn = document.getElementById('cancel-btn');
    
    if (form) {
        form.removeEventListener('submit', handleFormSubmit);
        form.addEventListener('submit', handleFormSubmit);
    }
    
    if (cancelBtn) {
        cancelBtn.removeEventListener('click', hidePostForm);
        cancelBtn.addEventListener('click', hidePostForm);
    }
}

function hidePostForm() {
    document.getElementById('post-form').classList.add('hidden');
    if (tinymceEditor) {
        tinymce.remove('#post-content');
        tinymceEditor = null;
    }
}

async function loadPostsList() {
    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        
        const container = document.getElementById('posts-container');
        container.innerHTML = posts.map(post => `
            <div class="post-list-item">
                <h3>${escapeHtml(post.title)}</h3>
                <p>Published: ${post.published_date} | Views: ${post.views}</p>
                <div class="post-actions">
                    <button class="btn btn-secondary" onclick="editPost(${post.id})">Edit</button>
                    <button class="btn btn-danger" onclick="deletePost(${post.id})">Delete</button>
                </div>
            </div>
        `).join('');
        
        document.getElementById('posts-list').classList.remove('hidden');
        document.getElementById('post-form').classList.add('hidden');
    } catch (error) {
        console.error('Failed to load posts:', error);
        alert('Failed to load posts');
    }
}

async function editPost(id) {
    try {
        const [postResponse, contentResponse] = await Promise.all([
            fetch('/api/posts'),
            fetch(`/api/posts/${id}`)
        ]);
        
        const posts = await postResponse.json();
        const contentData = await contentResponse.json();
        const post = posts.find(p => p.id === id);
        
        if (post) {
            document.getElementById('post-title').value = post.title;
            document.getElementById('post-date').value = post.published_date;
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(contentData.content, 'text/html');
            const contentDiv = doc.querySelector('.post-content');
            const content = contentDiv ? contentDiv.innerHTML : '';
            
            document.getElementById('form-title').textContent = 'Edit Post';
            currentEditingId = id;
            showCreateForm();
            
            setTimeout(() => {
                if (tinymceEditor) {
                    tinymceEditor.setContent(content);
                } else {
                    document.getElementById('post-content').value = content;
                }
            }, 500);
        }
    } catch (error) {
        console.error('Failed to load post for editing:', error);
        alert('Failed to load post for editing');
    }
}

async function deletePost(id) {
    if (confirm('Are you sure you want to delete this post?')) {
        try {
            const response = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
            if (response.ok) {
                loadPostsList();
            } else {
                alert('Failed to delete post');
            }
        } catch (error) {
            console.error('Failed to delete post:', error);
            alert('Failed to delete post');
        }
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    console.log('=== Form Submission Started ===');
    
    const isAuthenticated = await verifyAuthBeforeSubmit();
    if (!isAuthenticated) {
        return;
    }
    
    const title = document.getElementById('post-title').value;
    const date = document.getElementById('post-date').value;
    const content = tinymceEditor ? tinymceEditor.getContent() : document.getElementById('post-content').value;
    
    console.log('Form data:', { title, date, content: content.substring(0, 100) + '...' });
    
    const postData = { title, published_date: date, content };
    
    try {
        const url = currentEditingId ? `/api/posts/${currentEditingId}` : '/api/posts';
        const method = currentEditingId ? 'PUT' : 'POST';
        
        console.log('Making API request:', method, url);
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        
        console.log('API Response:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Success response:', result);
            hidePostForm();
            loadPostsList();
            alert(currentEditingId ? 'Post updated successfully!' : 'Post created successfully!');
        } else {
            const errorText = await response.text();
            console.error('API Error Response:', response.status, errorText);
            
            if (response.status === 401) {
                alert('Authentication required. Please log in again.');
                window.location.reload();
            } else {
                alert(`Failed to save post: ${errorText}`);
            }
        }
    } catch (error) {
        console.error('Network/JavaScript Error:', error);
        alert(`Failed to save post: ${error.message}`);
    }
}

async function handleLogout() {
    try {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.reload();
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.reload();
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

window.editPost = editPost;
window.deletePost = deletePost;
