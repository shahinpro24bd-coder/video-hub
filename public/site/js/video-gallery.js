(function () {
    'use strict';

    var containers = document.querySelectorAll('[data-video-gallery]');
    if (!containers.length) return;

    // Public (publishable) database key - safe to ship in the browser; no secret keys or env vars needed.
    var DB_URL = 'https://zhghhdrfdniscjwajyvp.supabase.co';
    var DB_KEY = 'sb_publishable_-idGPFcWiKCTBSBXCV_Bmw_Fk6my-o8';
    var DB_HEADERS = { apikey: DB_KEY, accept: 'application/json', 'content-type': 'application/json' };

    function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, function (char) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
        });
    }

    function embedUrl(video) {
        if (video.provider === 'youtube' && video.video_key) {
            return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(video.video_key);
        }
        return 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(video.source_url) + '&show_text=false&width=800';
    }

    // Delete buttons are only shown on the page that has the add-video form (video2.html).
    var allowDelete = !!document.getElementById('videoSubmitForm');
    var adminPass = '';
    try { adminPass = sessionStorage.getItem('videoAdminPass') || ''; } catch (e) {}
    if (allowDelete) {
        var mainEl = document.querySelector('main') || document.body;
        mainEl.style.display = 'none';
        var gate = document.createElement('div');
        gate.className = 'video-gate';
        gate.innerHTML = '<form class="video-gate-box"><h3>Enter Password</h3><p>This page is protected.</p>' +
            '<input type="password" class="form-control" placeholder="Password" required autocomplete="current-password">' +
            '<button type="submit" class="btn btn-primary w-100 mt-3">Enter</button><p class="video-gate-error"></p></form>';
        mainEl.parentNode.insertBefore(gate, mainEl);
        var gForm = gate.querySelector('form'), gInput = gate.querySelector('input'), gErr = gate.querySelector('.video-gate-error');
        var tryPass = function (pw, silent) {
            return fetch(DB_URL + '/rest/v1/rpc/check_video_password', { method: 'POST', headers: DB_HEADERS, body: JSON.stringify({ p_password: pw }) })
                .then(function (r) { return r.json(); })
                .then(function (ok) {
                    if (ok === true) {
                        adminPass = pw;
                        try { sessionStorage.setItem('videoAdminPass', pw); } catch (e) {}
                        gate.remove(); mainEl.style.display = '';
                    } else if (!silent) { gErr.textContent = 'Wrong password. Please try again.'; }
                })
                .catch(function () { if (!silent) gErr.textContent = 'Could not check the password. Please try again.'; });
        };
        gForm.addEventListener('submit', function (e) { e.preventDefault(); gErr.textContent = ''; tryPass(gInput.value, false); });
        if (adminPass) tryPass(adminPass, true);
    }

    function videoCard(video) {
        var provider = video.provider === 'youtube' ? 'YouTube' : 'Facebook';
        var deleteBtn = allowDelete
            ? '<button type="button" class="video-delete-btn" data-video-id="' + escapeHtml(video.id) + '" title="Delete video"><i class="fas fa-trash"></i> Delete</button>'
            : '';
        return '<article class="video-card">' +
            '<div class="video-frame"><iframe src="' + escapeHtml(embedUrl(video)) + '" title="' + provider + ' video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>' +
            '<div class="video-card-meta"><span><i class="fab fa-' + (video.provider === 'youtube' ? 'youtube' : 'facebook-f') + '"></i> ' + provider + '</span>' +
            '<a href="' + escapeHtml(video.source_url) + '" target="_blank" rel="noopener">Watch original <i class="fas fa-arrow-up-right-from-square"></i></a>' + deleteBtn + '</div>' +
            '</article>';
    }

    function deleteVideo(id, button) {
        if (!confirm('Delete this video?')) return;
        button.disabled = true;
        fetch(DB_URL + '/rest/v1/rpc/delete_video_secure', {
            method: 'POST',
            headers: DB_HEADERS,
            body: JSON.stringify({ p_id: id, p_password: adminPass })
        })
            .then(function (response) { if (!response.ok) throw new Error(); return loadVideos(); })
            .catch(function () { alert('The video could not be deleted. Please try again.'); button.disabled = false; });
    }

    function render(videos) {
        containers.forEach(function (container) {
            var limit = Number(container.getAttribute('data-limit') || videos.length);
            var items = videos.slice(0, limit);
            if (!items.length) {
                container.innerHTML = '<div class="video-state"><i class="fas fa-video"></i><p>No videos have been added yet.</p></div>';
                return;
            }
            container.innerHTML = items.map(videoCard).join('');
            if (allowDelete) {
                container.querySelectorAll('.video-delete-btn').forEach(function (btn) {
                    btn.addEventListener('click', function () { deleteVideo(btn.getAttribute('data-video-id'), btn); });
                });
            }
        });
    }

    function showError(message) {
        containers.forEach(function (container) {
            container.innerHTML = '<div class="video-state video-state-error"><i class="fas fa-circle-exclamation"></i><p>' + escapeHtml(message) + '</p></div>';
        });
    }

    function loadVideos() {
        containers.forEach(function (container) {
            container.innerHTML = '<div class="video-state"><span class="video-loader"></span><p>Loading videos...</p></div>';
        });
        return fetch(DB_URL + '/rest/v1/videos?select=id,source_url,provider,video_key,created_at&order=created_at.desc&limit=100', { headers: DB_HEADERS })
            .then(function (response) { if (!response.ok) throw new Error(); return response.json(); })
            .then(function (videos) { render(videos || []); })
            .catch(function () { showError('Videos could not be loaded. Please refresh the page.'); });
    }

    var form = document.getElementById('videoSubmitForm');
    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var input = document.getElementById('videoUrl');
            var website = document.getElementById('videoWebsite');
            var button = form.querySelector('button[type="submit"]');
            var status = document.getElementById('videoFormStatus');
            var value = input ? input.value.trim() : '';
            if (!/^https:\/\//i.test(value)) {
                status.className = 'video-form-status is-error';
                status.textContent = 'Please paste a complete YouTube or Facebook link beginning with https://';
                return;
            }
            button.disabled = true;
            status.className = 'video-form-status';
            status.textContent = 'Adding video...';
            if (website && website.value) { button.disabled = false; return; }
            fetch(DB_URL + '/rest/v1/rpc/submit_video_secure', {
                method: 'POST',
                headers: DB_HEADERS,
                body: JSON.stringify({ p_url: value, p_password: adminPass })
            })
                .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
                .then(function (result) {
                    if (!result.ok) throw new Error(result.body.message || result.body.error || 'The video could not be added.');
                    input.value = '';
                    status.className = 'video-form-status is-success';
                    status.textContent = 'Video added successfully.';
                    return loadVideos();
                })
                .catch(function (error) {
                    status.className = 'video-form-status is-error';
                    status.textContent = error.message;
                })
                .finally(function () { button.disabled = false; });
        });
    }

    loadVideos();
})();
