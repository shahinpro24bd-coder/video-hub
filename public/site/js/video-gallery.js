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

    function videoCard(video) {
        var provider = video.provider === 'youtube' ? 'YouTube' : 'Facebook';
        return '<article class="video-card">' +
            '<div class="video-frame"><iframe src="' + escapeHtml(embedUrl(video)) + '" title="' + provider + ' video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>' +
            '<div class="video-card-meta"><span><i class="fab fa-' + (video.provider === 'youtube' ? 'youtube' : 'facebook-f') + '"></i> ' + provider + '</span>' +
            '<a href="' + escapeHtml(video.source_url) + '" target="_blank" rel="noopener">Watch original <i class="fas fa-arrow-up-right-from-square"></i></a></div>' +
            '</article>';
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
            fetch(DB_URL + '/rest/v1/rpc/submit_video', {
                method: 'POST',
                headers: DB_HEADERS,
                body: JSON.stringify({ p_url: value })
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
