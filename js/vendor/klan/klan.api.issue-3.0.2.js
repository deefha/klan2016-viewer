(function ($) {

$.klan = $.klan || {};
$.klan.api = $.klan.api || {};
$.klan.api.issue = $.klan.api.issue || {};



$.klan.api.issue.manifest = function(issue, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var key = sprintf('%s',
		issue
	);

	if (reload || !$.klan.api.cache_get(key)) {
		return $.ajax({
			url: $.klan.api.url(key),
			dataType: 'jsonp',
			success: function(response) {
			}
		})
		.then(function(response) {
			$.klan.api.cache_set(key, response);
			return $.klan.api.cache_get(key);
		});
	}
	else {
		return $.klan.api.cache_get(key);
	}
}



$.klan.api.issue.screens = function(issue, index, id, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var index = typeof index !== 'undefined' ? index : false;
	var id = typeof id !== 'undefined' ? id : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/screens/%s%s',
		issue,
		index,
		id ? sprintf('/%03d', id) : ''
	);

	if (reload || !$.klan.api.cache_get(key)) {
		return $.ajax({
			url: $.klan.api.url(key),
			dataType: 'jsonp',
			success: function(response) {
			}
		})
		.then(function(response) {
			$.klan.api.cache_set(key, response);
			return $.klan.api.cache_get(key);
		});
	}
	else {
		return $.klan.api.cache_get(key);
	}
}



$.klan.api.issue.images = function(issue, index, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var index = typeof index !== 'undefined' ? index : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/images/%s',
		issue,
		index
	);

	if (reload || !$.klan.api.cache_get(key)) {
		return $.ajax({
			url: $.klan.api.url(key),
			dataType: 'jsonp',
			success: function(response) {
			}
		})
		.then(function(response) {
			$.klan.api.cache_set(key, response);
			return $.klan.api.cache_get(key);
		});
	}
	else {
		return $.klan.api.cache_get(key);
	}
}



$.klan.api.issue.texts = function(issue, index, id, variant, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var index = typeof index !== 'undefined' ? index : false;
	var id = typeof id !== 'undefined' ? id : false;
	var variant = typeof variant !== 'undefined' ? variant : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/texts/%s%s',
		issue,
		index,
		id && variant ? sprintf('/%03d/%s', id, variant) : ''
	);

	if (reload || !$.klan.api.cache_get(key)) {
		return $.ajax({
			url: $.klan.api.url(key),
			dataType: 'jsonp',
			success: function(response) {
			}
		})
		.then(function(response) {
			$.klan.api.cache_set(key, response);
			return $.klan.api.cache_get(key);
		});
	}
	else {
		return $.klan.api.cache_get(key);
	}
}



$.klan.api.issue.fonts = function(issue, index, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var index = typeof index !== 'undefined' ? index : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/fonts/%s',
		issue,
		index
	);

	if (reload || !$.klan.api.cache_get(key)) {
		return $.ajax({
			url: $.klan.api.url(key),
			dataType: 'jsonp',
			success: function(response) {
			}
		})
		.then(function(response) {
			$.klan.api.cache_set(key, response);
			return $.klan.api.cache_get(key);
		});
	}
	else {
		return $.klan.api.cache_get(key);
	}
}



$.klan.api.issue.sounds = function(issue, index, reload) {
	var issue = typeof issue !== 'undefined' ? issue : false;
	var index = typeof index !== 'undefined' ? index : false;
	var reload = typeof reload !== 'undefined' ? reload : false;
	var key = sprintf('%s/sounds/%s',
		issue,
		index
	);

	if (reload || !$.klan.api.cache_get(key)) {
		return $.ajax({
			url: $.klan.api.url(key),
			dataType: 'jsonp',
			success: function(response) {
			}
		})
		.then(function(response) {
			$.klan.api.cache_set(key, response);
			return $.klan.api.cache_get(key);
		});
	}
	else {
		return $.klan.api.cache_get(key);
	}
}



})(jQuery);
