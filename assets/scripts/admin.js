document.addEventListener('DOMContentLoaded', () => {
  const adminStatus = document.getElementById('admin-status');
  const adminContent = document.getElementById('admin-content');
  const adminLogin = document.getElementById('admin-login');
  const postsList = document.getElementById('posts-list');
  const createPostForm = document.getElementById('create-post-form');

  // Check admin status
  async function checkAdmin() {
    try {
      const res = await fetch('/api/user_status');
      const data = await res.json();
      if (data.authenticated) {
        // Try to fetch admin posts to check admin rights
        const adminRes = await fetch('/api/admin/posts');
        if (adminRes.ok) {
          adminStatus.textContent = 'Admin access granted.';
          adminContent.style.display = '';
          adminLogin.style.display = 'none';
          fetchPosts();
        } else {
          adminStatus.textContent = 'You are not an admin.';
          adminContent.style.display = 'none';
          adminLogin.style.display = '';
        }
      } else {
        adminStatus.textContent = 'You are not logged in.';
        adminContent.style.display = 'none';
        adminLogin.style.display = '';
      }
    } catch (e) {
      adminStatus.textContent = 'Error checking admin status.';
      adminContent.style.display = 'none';
      adminLogin.style.display = '';
    }
  }

  // Fetch and display posts
  async function fetchPosts() {
    postsList.innerHTML = '<p>Loading posts...</p>';
    try {
      const res = await fetch('/api/admin/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const posts = await res.json();
      if (!Array.isArray(posts) || posts.length === 0) {
        postsList.innerHTML = '<p>No posts found.</p>';
        return;
      }
      postsList.innerHTML = '';
      posts.forEach(post => {
        const postDiv = document.createElement('div');
        postDiv.className = 'admin-post-item';
        postDiv.innerHTML = `
          <strong>${post.title}</strong> <span>(${post.published_date})</span>
          <button class="admin-edit-btn" data-id="${post.id}">Edit</button>
          <button class="admin-delete-btn" data-id="${post.id}">Delete</button>
        `;
        postsList.appendChild(postDiv);
      });
      // Attach event listeners
      postsList.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeletePost);
      });
      postsList.querySelectorAll('.admin-edit-btn').forEach(btn => {
        btn.addEventListener('click', handleEditPost);
      });
    } catch (e) {
      postsList.innerHTML = '<p>Error loading posts.</p>';
    }
  }

  // Create post
  if (createPostForm) {
    createPostForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('post-title').value.trim();
      const content = document.getElementById('post-content').value.trim();
      const published_date = document.getElementById('post-date').value;
      if (!title || !content) {
        alert('Title and content are required.');
        return;
      }
      try {
        const res = await fetch('/api/admin/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, published_date: published_date || null })
        });
        if (!res.ok) throw new Error('Failed to create post');
        createPostForm.reset();
        fetchPosts();
        alert('Post created successfully!');
      } catch (e) {
        alert('Error creating post.');
      }
    });
  }

  // Delete post
  async function handleDeletePost(e) {
    const id = e.target.getAttribute('data-id');
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete post');
      fetchPosts();
      alert('Post deleted successfully!');
    } catch (e) {
      alert('Error deleting post.');
    }
  }

  // Edit post (simple prompt-based for now)
  async function handleEditPost(e) {
    const id = e.target.getAttribute('data-id');
    try {
      const res = await fetch('/api/admin/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const posts = await res.json();
      const post = posts.find(p => p.id == id);
      if (!post) return alert('Post not found.');
      const newTitle = prompt('Edit title:', post.title);
      if (newTitle === null) return;
      const newContent = prompt('Edit content (HTML):', post.content || '');
      if (newContent === null) return;
      const newDate = prompt('Edit published date (YYYY-MM-DD):', post.published_date);
      const payload = {
        title: newTitle,
        content: newContent,
        published_date: newDate || null
      };
      const updateRes = await fetch(`/api/admin/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!updateRes.ok) throw new Error('Failed to update post');
      fetchPosts();
      alert('Post updated successfully!');
    } catch (e) {
      alert('Error editing post.');
    }
  }

  // Initial check
  checkAdmin();
}); 