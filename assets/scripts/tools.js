document.addEventListener('DOMContentLoaded', () => {
  const addPostForm = document.getElementById('add-post-form');
  const postsList = document.getElementById('posts-list');
  const notAuthorized = document.getElementById('not-authorized');
  const toolsUI = document.getElementById('tools-ui');
  const githubSignin = document.getElementById('github-signin');
  const logoutBtn = document.getElementById('logout-btn');

  // Check GitHub authentication status
  async function checkAuth() {
    try {
      const res = await fetch('/api/user_status');
      if (!res.ok) throw new Error('Failed to check user status');
      const data = await res.json();
      if (data.authenticated) {
        notAuthorized.style.display = 'none';
        toolsUI.style.display = '';
        fetchPosts();
      } else {
        notAuthorized.style.display = '';
        toolsUI.style.display = 'none';
      }
    } catch (e) {
      notAuthorized.style.display = '';
      toolsUI.style.display = 'none';
    }
  }

  // GitHub sign-in
  if (githubSignin) {
    githubSignin.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/auth/start_github_oauth';
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await fetch('/auth/logout', { method: 'POST' });
      checkAuth();
    });
  }

  // Fetch and display posts
  async function fetchPosts() {
    postsList.innerHTML = '<p>Loading posts...</p>';
    try {
      const res = await fetch('/api/posts');
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
          <button class="admin-delete-btn" data-id="${post.id}">Delete</button>
        `;
        postsList.appendChild(postDiv);
      });
      postsList.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeletePost);
      });
    } catch (e) {
      postsList.innerHTML = '<p>Error loading posts.</p>';
    }
  }

  // Add post
  if (addPostForm) {
    addPostForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('post-title').value.trim();
      const content = document.getElementById('post-content').value.trim();
      const published_date = document.getElementById('post-date').value;
      if (!title || !content) {
        alert('Title and content are required.');
        return;
      }
      try {
        const res = await fetch('/api/tools/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, published_date: published_date || null })
        });
        if (!res.ok) throw new Error('Failed to add post');
        addPostForm.reset();
        fetchPosts();
        alert('Post added successfully!');
      } catch (e) {
        alert('Error adding post.');
      }
    });
  }

  // Delete post
  async function handleDeletePost(e) {
    const id = e.target.getAttribute('data-id');
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`/api/tools/posts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete post');
      fetchPosts();
      alert('Post deleted successfully!');
    } catch (e) {
      alert('Error deleting post.');
    }
  }

  // Initial load
  checkAuth();
}); 