(function($) {

$.klan = $.klan || {};
$.klan.app = $.klan.app || {};

$.klan.app.viewer = function(element, options) {
	var defaults = {
		issue: '00'
	}

	var $element = $(element);
	var element = element;
	var plugin = this;

	plugin.meta = {
		name: 'klan.app.viewer',
		version: '3.1.0'
	}

	plugin.settings = {}
	plugin.cache = {}
	plugin.actual = {}
	plugin.previous = {}
	plugin.wrappers = {}

	plugin.init = function() {
		plugin.settings = $.extend({}, defaults, options);

		if ($.query.get('debug')) {
			$('body').addClass('debug');
		}

		$.when.all([
			$.klan.api.manifest()
		]).done(function(responses) {
			plugin.cache.manifest = responses[0];

			plugin.cache.issue = {}

			plugin.actual.issue = null;
			plugin.actual.library = null;
			plugin.actual.index = null;
			plugin.actual.id = null;
			plugin.previous.issue = null;
			plugin.previous.library = null;
			plugin.previous.index = null;
			plugin.previous.id = null;

			crossroads.addRoute('/{issue}/:library:/:index:/:id:', function(issue, library, index, id) {
				plugin.previous.issue = plugin.actual.issue;
				plugin.previous.library = plugin.actual.library;
				plugin.previous.index = plugin.actual.index;
				plugin.previous.id = plugin.actual.id;
				plugin.actual.issue = issue;
				plugin.actual.library = (typeof library === 'undefined') ? null : library;
				plugin.actual.index = (typeof index === 'undefined') ? null : index;
				plugin.actual.id = (typeof id === 'undefined') ? null : id;

				if (plugin.actual.issue != plugin.previous.issue) {
					issue_manifest_load(function() {
						issue_manifest_render(true);
						common_onchange();
					});
				}
				else {
					common_onchange();
				}
			});

			function hasher_init(hash_current) {
				if (hash_current == '') {
					hasher.replaceHash(plugin.settings.issue);
				}
				else {
					crossroads.parse(hash_current);
				}
			}

			function hasher_parse(hash_new, hash_old) {
				crossroads.parse(hash_new);
			}

			wrappers_prepare();
			manifest_prepare();
			issue_manifest_prepare();
			library_prepare();

			manifest_render(true);

			hasher.initialized.add(hasher_init);
			hasher.changed.add(hasher_parse);
			hasher.init();
		});
	}



// ******************************************* common *******************************************
	var common_onchange = function() {
		if (
			plugin.actual.issue != plugin.previous.issue ||
			plugin.actual.library != plugin.previous.library ||
			plugin.actual.index != plugin.previous.index ||
			plugin.actual.id != plugin.previous.id
		) {
			var tree = $.jstree.reference($('.issue-manifest', plugin.wrappers.aside));
			var node = sprintf(
				'#tree-%s%s%s%s',
				plugin.actual.issue,
				plugin.actual.library ? sprintf('-%s', plugin.actual.library) : '',
				plugin.actual.index ? sprintf('-%s', plugin.actual.index) : '',
				plugin.actual.id ? sprintf('-%s', plugin.actual.id) : ''
			);

			if (!tree.is_selected(node)) {
				tree.deselect_all(true);
				tree.select_node(node, true);
				tree.redraw(true);
			}

			if (plugin.actual.index) {
				library_load(function() {
					library_render(true);
				});
			}
			else {
				library_clear();
			}
		}
	}



// ******************************************* wrappers *******************************************
	var wrappers_prepare = function() {
		$element.html(sprintf(
			'<div class="klan-app-viewer clearfix">' +
				'<div class="wrapper-aside"></div>' +
				'<div class="wrapper-main"></div>' +
			'</div>'
		));

		plugin.wrappers.aside = $('.wrapper-aside', $element);
		plugin.wrappers.main = $('.wrapper-main', $element);
	}



	// ******************************************* manifest *******************************************
	var manifest_prepare = function() {
		plugin.wrappers.aside.append('<div class="manifest"></div>');
	}



	var manifest_load = function(callback) {
	}



	var manifest_render = function(force) {
		force = (typeof force === 'undefined') ? false : force;

		var output = '';
 
		if (force) {
			var output_manifest = [];

			$.each(plugin.cache.manifest, function(manifest_index, manifest) {
				output_manifest.push(sprintf(
					'<option value="%s">#%s</option>',
					manifest,
					manifest
				));
			});

			output += sprintf(
				'<select>%s</select>',
				output_manifest.join('')
			);

			$('.manifest', plugin.wrappers.aside).html(output);

			$('.manifest select', plugin.wrappers.aside)
				.on('change', function() {
					hasher.replaceHash(sprintf('%s', this.value));
				});
		}
	}



	// ******************************************* issue manifest *******************************************
	var issue_manifest_prepare = function() {
		plugin.wrappers.aside.append('<div class="issue-manifest"></div>');
	}



	var issue_manifest_load = function(callback) {
		$.when.all([
			$.klan.api.issue.manifest(plugin.actual.issue)
		]).done(function(responses) {
			plugin.cache.issue.manifest = responses[0];

			var preload = []

			$.each(plugin.cache.issue.manifest.libraries, function(libraries_index, libraries) {
				if (libraries) {
					$.each(libraries, function(library_index, library) {
						if (libraries_index == 'fonts') {
							preload.push($.klan.api.issue.fonts(plugin.actual.issue, library_index));
						}
						else if (libraries_index == 'images') {
							preload.push($.klan.api.issue.images(plugin.actual.issue, library_index));
						}
					});
				}
			});

			$.when.all(
				preload
			).done(function(responses) {
				if (typeof callback !== 'undefined') {
					callback();
				}
			});
		});
	}



	var issue_manifest_render = function(force) {
		force = (typeof force === 'undefined') ? false : force;

		var output = '';
 
		if (force) {
			var output_manifest = [];
			var output_libraries = [];

			$.each(plugin.cache.issue.manifest.libraries, function(libraries_index, libraries) {
				output_libraries = [];

				if (libraries) {
					$.each(libraries, function(library_index, library) {
						var output_items = []

						if (libraries_index == 'fonts') {
							$.each($.klan.api.issue.fonts(plugin.actual.issue, library_index).fonts, function(font_index, font) {
								output_items.push(sprintf(
									'<li id="tree-%s-%s-%s-%s" data-jstree=\'{"icon":"jstree-file"}\'><a href="#/%s/%s/%s/%s">%s</a></li>',
									plugin.actual.issue,
									libraries_index,
									library_index,
									font_index,
									plugin.actual.issue,
									libraries_index,
									library_index,
									font_index,
									font_index
								));
							});
						}

						output_libraries.push(sprintf(
							'<li id="tree-%s-%s-%s" data-jstree=\'{"icon":"jstree-file"}\'><a href="#/%s/%s/%s">[%s] %s</a>%s</li>',
							plugin.actual.issue,
							libraries_index,
							library_index,
							plugin.actual.issue,
							libraries_index,
							library_index,
							library_index,
							library.path,
							output_items.length ?
								sprintf(
									'<ul>%s</ul>',
									output_items.join('')
								) :
								''
						));
					});
				}

				output_manifest.push(sprintf(
					'<li id="tree-%s-%s" data-jstree=\'{"disabled":%s}\'>%s%s</li>',
					plugin.actual.issue,
					libraries_index,
					output_libraries.length ?
						'false' :
						'true',
					libraries_index,
					output_libraries.length ?
						sprintf(
							'<ul>%s</ul>',
							output_libraries.join('')
						) :
						''
				));
			});

			output += sprintf(
				'<ul>%s</ul>',
				output_manifest.join('')
			);

			var tree = $.jstree.reference($('.issue-manifest', plugin.wrappers.aside));
			
			if (tree) {
				tree.destroy();
			}

			$('.issue-manifest', plugin.wrappers.aside).html(output);

			$('.issue-manifest', plugin.wrappers.aside)
				.on('changed.jstree', function(e, data) {
					if (data && data.node) {
						hasher.replaceHash(data.node.a_attr.href.replace('#/', ''));
					}
				})
				.jstree({
					core: {
						check_callback: true,
						themes: {
							variant: 'small'
						}
					},
					plugins: [
						'sort',
						'wholerow'
					]
				});
		}
	}



	// ******************************************* library *******************************************
	var library_prepare = function() {
	}



	var library_load = function(callback) {
		var preload = [];

		if (plugin.actual.library == 'cursors') {
			preload.push($.klan.api.issue.cursors(plugin.actual.issue, plugin.actual.index));
		}
		else if (plugin.actual.library == 'fonts') {
			preload.push($.klan.api.issue.fonts(plugin.actual.issue, plugin.actual.index));
		}
		else if (plugin.actual.library == 'images') {
			preload.push($.klan.api.issue.images(plugin.actual.issue, plugin.actual.index));
		}

		$.when.all(
			preload
		).done(function(responses) {
			plugin.cache.issue.library = responses[0];

			if (typeof callback !== 'undefined') {
				callback();
			}
		});
	}



	var library_render = function(force) {
		force = (typeof force === 'undefined') ? false : force;

		var output = '';
 
		if (force) {
			var output_library = [];

			if (plugin.actual.library == 'cursors') {
				var image_max_width = 320;
				var image_max_height = 320;
				var image_display_height;
				var image_zoom;
				var image_url;

				$.each(plugin.cache.issue.library.frames, function(cursor_index, cursor) {
// 					image_display_height = image.width > image_max_width ?
// 						image.height * (image_max_width / image.width) :
// 						image.height;
// 					image_display_height = image_display_height <= image_max_height ?
// 						image_display_height :
// 						image_max_height;
// 					image_zoom = image.width > image_max_width || image.height > image_max_height;
					image_url = sprintf(
						'https://api.klan2016.cz/%s/cursors/%s/%02d.png',
						plugin.actual.issue,
						plugin.actual.index,
						cursor_index
					);

					output_library.push(sprintf(
						'<div class="item item-cursor%s"><div class="meta">[%s] %sx%s</div><div class="data">%s<img src="%s" style="margin-top:%spx;" />%s</div></div>',
						image_zoom ? ' zoom' : '',
						cursor_index,
						'W',
						'H',
						image_zoom ? sprintf('<a href="%s" data-featherlight="image">', image_url) : '',
						image_url,
// 						Math.round((image_max_height - image_display_height) / 2),
						0,
						image_zoom ? '</a>' : ''
					));
				});
			}

			else if (
				plugin.actual.library == 'fonts' &&
				plugin.actual.id
			) {
				var image_max_width = 320;
				var image_max_height = 320;
				var image_display_height;
				var image_zoom;
				var image_url;

				$.each(plugin.cache.issue.library.fonts[plugin.actual.id], function(variant_index, variant) {
// 					image_display_height = image.width > image_max_width ?
// 						image.height * (image_max_width / image.width) :
// 						image.height;
// 					image_display_height = image_display_height <= image_max_height ?
// 						image_display_height :
// 						image_max_height;
// 					image_zoom = image.width > image_max_width || image.height > image_max_height;
					image_url = sprintf(
						'https://api.klan2016.cz/%s/fonts/%s/%02d/%s.png',
						plugin.actual.issue,
						plugin.actual.index,
						plugin.actual.id,
						variant_index
					);

					output_library.push(sprintf(
						'<div class="item item-font%s"><div class="meta">[%s] %s</div><div class="data">%s<img src="%s" style="margin-top:%spx;" />%s</div></div>',
						image_zoom ? ' zoom' : '',
						plugin.actual.id,
						variant_index,
						image_zoom ? sprintf('<a href="%s" data-featherlight="image">', image_url) : '',
						image_url,
// 						Math.round((image_max_height - image_display_height) / 2),
						0,
						image_zoom ? '</a>' : ''
					));
				});
			}

			else if (plugin.actual.library == 'images') {
				var image_max_width = 320;
				var image_max_height = 240;
				var image_display_height;
				var image_zoom;
				var image_url;

				$.each(plugin.cache.issue.library.images, function(image_index, image) {
					image_display_height = image.width > image_max_width ?
						image.height * (image_max_width / image.width) :
						image.height;
					image_display_height = image_display_height <= image_max_height ?
						image_display_height :
						image_max_height;
					image_zoom = image.width > image_max_width || image.height > image_max_height;
					image_url = sprintf(
						'https://api.klan2016.cz/%s/images/%s/%04d.png',
						plugin.actual.issue,
						plugin.actual.index,
						image_index
					);

					output_library.push(sprintf(
						'<div class="item item-image%s"><div class="meta">#%s %sx%s M%s</div><div class="data">%s<img src="%s" style="margin-top:%spx;" />%s</div></div>',
						image_zoom ? ' zoom' : '',
						image_index,
						image.width,
						image.height,
						image.mode,
						image_zoom ? sprintf('<a href="%s" data-featherlight="image">', image_url) : '',
						image_url,
						Math.round((image_max_height - image_display_height) / 2),
						image_zoom ? '</a>' : ''
					));
				});
			}

			output += sprintf(
				'%s',
				output_library.join('')
			);

			plugin.wrappers.main.html(output);
		}
	}



	var library_clear = function() {
		var output = '';
 
		plugin.wrappers.main.html(output);
	}



	plugin.init();
}



$.fn.klan_app_viewer = function(options) {
	return this.each(function() {
		if (undefined === $(this).data('klan_app_viewer')) {
			var plugin = new $.klan.app.viewer(this, options);
			$(this).data('klan_app_viewer', plugin);
		}
	});
}

})(jQuery);
