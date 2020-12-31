(function($) {

$.klan = $.klan || {};
$.klan.app = $.klan.app || {};

function Utils() {}
Utils.prototype = {
	constructor: Utils,
	isElementInView: function (element, fullyInView) {
		var pageTop = $(window).scrollTop();
		var pageBottom = pageTop + $(window).height();
		var elementTop = $(element).offset().top;
		var elementBottom = elementTop + $(element).height();

		if (fullyInView === true) {
			return ((pageTop < elementTop) && (pageBottom > elementBottom));
		} else {
			return ((elementTop <= pageBottom) && (elementBottom >= pageTop));
		}
	}
};
var Utils = new Utils();

$.klan.app.viewer = function(element, options) {
	var defaults = {
		issue: '00'
	}

	var $element = $(element);
	var element = element;
	var plugin = this;

	plugin.meta = {
		name: 'klan.app.viewer',
		version: '3.1.5'
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

			plugin.actual.waveforms = {};

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
						manifest_render();
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
			plugin.actual.library == 'images' &&
			plugin.actual.issue == plugin.previous.issue &&
			plugin.actual.library == plugin.previous.library &&
			plugin.actual.index == plugin.previous.index &&
			plugin.actual.id != plugin.previous.id
		) {
			library_render(false);
		}
		else if (
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
				plugin.actual.id && plugin.actual.library !== 'images' ? sprintf('-%s', plugin.actual.id) : ''
			);

			if (!tree.is_selected(node)) {
				tree.deselect_all(true);
				tree.select_node(node, true);
				tree.redraw(true);
			}

			library_clear();

			if (plugin.actual.index) {
				library_load(function() {
					library_render(true);
				});
			}
		}
	}



// ******************************************* wrappers *******************************************
	var wrappers_prepare = function() {
		$element.html(sprintf(
			'<div class="klan-app-viewer clearfix">' +
				'<div class="wrapper-aside"><h1>KLAN viewer v%s (<a href="https://github.com/deefha/klan2016-viewer" target="_blank">GitHub</a>)<h1></div>' +
				'<div class="wrapper-main clearfix"></div>' +
			'</div>',
			plugin.meta.version
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
					'<option value="%s">Issue #%s</option>',
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

		if ($('.manifest select', plugin.wrappers.aside).val() != plugin.actual.issue) {
			$('.manifest select', plugin.wrappers.aside).val(plugin.actual.issue);
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
						if (libraries_index == 'audio') {
							preload.push($.klan.api.issue.audio(plugin.actual.issue, library_index));
						}
						if (libraries_index == 'cursors') {
							preload.push($.klan.api.issue.cursors(plugin.actual.issue, library_index));
						}
						if (libraries_index == 'descriptions') {
							preload.push($.klan.api.issue.descriptions(plugin.actual.issue, library_index));
						}
						if (libraries_index == 'fonts') {
							preload.push($.klan.api.issue.fonts(plugin.actual.issue, library_index));
						}
						if (libraries_index == 'images') {
							preload.push($.klan.api.issue.images(plugin.actual.issue, library_index));
						}
						if (libraries_index == 'screens') {
							preload.push($.klan.api.issue.screens(plugin.actual.issue, library_index));
						}
						if (libraries_index == 'texts') {
							preload.push($.klan.api.issue.texts(plugin.actual.issue, library_index));
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
									'<li id="tree-%s-%s-%s-%s" data-jstree=\'{"icon":"jstree-file"}\'><a href="#/%s/%s/%s/%s">#%2s</a></li>',
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

						if (libraries_index == 'screens') {
							$.each($.klan.api.issue.screens(plugin.actual.issue, library_index).screens, function(screen_index, screen) {
								output_items.push(sprintf(
									'<li id="tree-%s-%s-%s-%s" data-jstree=\'{"icon":"jstree-file"}\'><a href="#/%s/%s/%s/%s">#%3s</a></li>',
									plugin.actual.issue,
									libraries_index,
									library_index,
									screen_index,
									plugin.actual.issue,
									libraries_index,
									library_index,
									screen_index,
									screen_index
								));
							});
						}

						if (libraries_index == 'texts') {
							$.each($.klan.api.issue.texts(plugin.actual.issue, library_index).texts, function(text_index, text) {
								output_items.push(sprintf(
									'<li id="tree-%s-%s-%s-%s" data-jstree=\'{"icon":"jstree-file"}\'><a href="#/%s/%s/%s/%s">#%3s %s</a></li>',
									plugin.actual.issue,
									libraries_index,
									library_index,
									text_index,
									plugin.actual.issue,
									libraries_index,
									library_index,
									text_index,
									text_index,
									text.name
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
					'<li id="tree-%s-%s" data-jstree=\'{"disabled":%s}\'><a href="#/%s/%s">%s</a>%s</li>',
					plugin.actual.issue,
					libraries_index,
					output_libraries.length ?
						'false' :
						'true',
					plugin.actual.issue,
					libraries_index,
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
						if (data.instance.is_closed(data.node)) {
							data.instance.open_node(data.node);
						}

						hasher.replaceHash(data.node.a_attr.href.replace('#/', ''));
					}
				})
				.jstree({
					core: {
						check_callback: true,
						dblclick_toggle: false,
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

		if (plugin.actual.library == 'audio') {
			preload.push($.klan.api.issue.audio(plugin.actual.issue, plugin.actual.index));
		}
		if (plugin.actual.library == 'cursors') {
			preload.push($.klan.api.issue.cursors(plugin.actual.issue, plugin.actual.index));
		}
		if (plugin.actual.library == 'descriptions') {
			preload.push($.klan.api.issue.descriptions(plugin.actual.issue, plugin.actual.index));
		}
		if (plugin.actual.library == 'fonts') {
			preload.push($.klan.api.issue.fonts(plugin.actual.issue, plugin.actual.index));
		}
		if (plugin.actual.library == 'images') {
			preload.push($.klan.api.issue.images(plugin.actual.issue, plugin.actual.index));
		}
		if (plugin.actual.library == 'screens') {
			preload.push($.klan.api.issue.screens(plugin.actual.issue, plugin.actual.index));
		}
		if (plugin.actual.library == 'texts') {
			preload.push($.klan.api.issue.texts(plugin.actual.issue, plugin.actual.index));
		}

		$.when.all(
			preload
		).done(function(responses) {
			plugin.cache.issue.library = responses[0];

			if (
				plugin.actual.library == 'screens' &&
				plugin.actual.id
			) {
				preload = [];
				preload.push($.klan.api.issue.screens(plugin.actual.issue, plugin.actual.index, plugin.actual.id));

				$.when.all(
					preload
				).done(function(responses) {
					if (typeof callback !== 'undefined') {
						callback();
					}
				});
			}
			else if (
				plugin.actual.library == 'texts' &&
				plugin.actual.id
			) {
				preload = [];

				$.each(plugin.cache.issue.library.texts[plugin.actual.id].variants, function(variant_index, variant) {
					if (variant.links) {
						preload.push($.klan.api.issue.texts(plugin.actual.issue, plugin.actual.index, plugin.actual.id, variant_index));
					}
				});

				if (preload.length) {
					$.when.all(
						preload
					).done(function(responses) {
						if (typeof callback !== 'undefined') {
							callback();
						}
					});
				}
				else {
					if (typeof callback !== 'undefined') {
						callback();
					}
				}
			}
			else {
				if (typeof callback !== 'undefined') {
					callback();
				}
			}
		});
	}



	var library_render = function(force) {
		force = (typeof force === 'undefined') ? false : force;

		var output = '';
 
		if (force) {
			var output_library = [];

			// pre-render

			if (plugin.actual.library == 'audio') {
				var wave_url;

				$.each(plugin.cache.issue.library.waves, function(wave_index, wave) {
					wave_url = sprintf(
						'https://api.klan2016.cz/%s/audio/%s/%04d.wav',
						plugin.actual.issue,
						plugin.actual.index,
						wave_index
					);

					output_library.push(sprintf(
						'<div class="item item-audio"><div class="meta">#%s %s M%s<br />%s</div><div class="data"><div id="waveform-%s" class="waveform" data-index="%s" data-url="%s"></div><div id="controls-%s" class="controls"><span class="loader">Loading...</span><button class="button-playpause">PLAY/PAUSE</button><button class="button-stop">STOP</button></div></div></div>',
						wave_index,
						wave.duration ?
							moment(Math.floor(wave.duration * 1000)).format('mm:ss.SSS') :
							'??:??.???',
						wave.mode,
						wave.title ? wave.title : '- no title -',
						wave_index,
						wave_index,
						wave_url,
						wave_index
					));
				});
			}

			if (plugin.actual.library == 'cursors') {
				var image_max_width = 320;
				var image_max_height = 240;
				var image_display_height;
				var image_zoom;
				var image_url;

				$.each(plugin.cache.issue.library.frames, function(frame_index, frame) {
					image_display_height = frame.width > image_max_width ?
						frame.height * (image_max_width / frame.width) :
						frame.height;
					image_display_height = image_display_height <= image_max_height ?
						image_display_height :
						image_max_height;
					image_zoom = frame.width > image_max_width || frame.height > image_max_height;
					image_url = sprintf(
						'https://api.klan2016.cz/%s/cursors/%s/%02d.png',
						plugin.actual.issue,
						plugin.actual.index,
						frame_index
					);

					output_library.push(sprintf(
						'<div class="item item-cursor%s"><div class="meta">#%s %sx%s</div><div class="data">%s<img src="%s" style="margin-top:%spx;" />%s</div></div>',
						image_zoom ? ' zoom' : '',
						frame_index,
						frame.width,
						frame.height,
						image_zoom ? sprintf('<a href="%s" data-featherlight="image">', image_url) : '',
						image_url,
						Math.round((image_max_height - image_display_height) / 2),
						image_zoom ? '</a>' : ''
					));
				});
			}

			if (plugin.actual.library == 'descriptions') {
				output_library.push('<table><tr><th>ID</th><th>Title</th></tr>');
				$.each(plugin.cache.issue.library.descriptions, function(description_index, description) {
					output_library.push(sprintf(
						'<tr><td>#%s</td><td>%s</td></tr>',
						description_index,
						description.title
					));
				});
				output_library.push('</table>');
			}

			if (
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
						'<div class="item item-font%s"><div class="meta">#%s %s</div><div class="data">%s<img src="%s" style="margin-top:%spx;" />%s</div></div>',
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

			if (plugin.actual.library == 'images') {
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
					image_url_original = sprintf(
						'https://api.klan2016.cz/%s/images/%s/%04d.png',
						plugin.actual.issue,
						plugin.actual.index,
						image_index
					);
					image_url_thumbnail = sprintf(
						'https://i.klan2016.cz/insecure/fit/320/240/ce/0/plain/local:///%s/images/%s/%04d.png@jpg',
						plugin.actual.issue,
						plugin.actual.index,
						image_index
					);

					output_library.push(sprintf(
						'<div id="image-%s" class="item item-image"><div class="meta">#%s %sx%s M%s<br />%s</div><div class="data"><a href="#/%s/%s/%s/%s"><img src="%s" alt="%s" data-original="%s" data-original-width="%s" style="padding-top:%spx;" /></a></div></div>',
						image_index,
						image_index,
						image.width,
						image.height,
						image.mode,
						image.title ? image.title : '- no title -',
						plugin.actual.issue,
						plugin.actual.library,
						plugin.actual.index,
						image_index,
						image_url_thumbnail,
						image.title ? image.title : '',
						image_url_original,
						image.width,
						Math.round((image_max_height - image_display_height) / 2)
					));
				});
			}

			if (
				plugin.actual.library == 'screens' &&
				plugin.actual.id
			) {
				output_library.push(sprintf(
					'<div class="item item-screen"><div class="meta">#%s</div><div class="data"><div class="screen"></div></div></div>',
					plugin.actual.id
				));
			}

			if (
				plugin.actual.library == 'texts' &&
				plugin.actual.id
			) {
				var image_url;

				$.each(plugin.cache.issue.library.texts[plugin.actual.id].variants, function(variant_index, variant) {
					if (variant_index <= 1) {
						var output_links = [];
						var links_count = 0;

						if (variant.links) {
							var links = $.klan.api.issue.texts(plugin.actual.issue, plugin.actual.index, plugin.actual.id, variant_index);
							links_count = Object.keys(links).length;

							$.each(links, function(link_index, link) {
								output_links.push(sprintf(
									'<div id="link-%s-%s" class="link" title="Link #%s" data-featherlight="#link-content-%s-%s" style="margin-top:%spx;margin-left:%spx;width:%spx;height:%spx;"></div><div id="link-content-%s-%s" class="link-content"></div>',
									variant_index,
									link_index,
									link_index,
									variant_index,
									link_index,
									link.area.topleft_y,
									link.area.topleft_x,
									link.area.bottomright_x - link.area.topleft_x,
									link.area.bottomright_y - link.area.topleft_y,
									variant_index,
									link_index
								));
							});
						}

						output_links = sprintf(
							'%s',
							output_links.join('')
						);

						image_url = sprintf(
							'https://api.klan2016.cz/%s/texts/%s/%03d/%s.png',
							plugin.actual.issue,
							plugin.actual.index,
							plugin.actual.id,
							variant_index
						);

						output_library.push(sprintf(
							'<div id="text-%s-%s" class="item item-text"><div class="meta">#%s %s V%s <button class="links-toggle" title="Toggle links">LINKS:%s</button><br />%s</div><div class="data"><div class="links">%s</div><img src="%s" /></div></div>',
							plugin.actual.id,
							variant_index,
							plugin.actual.id,
							plugin.cache.issue.library.texts[plugin.actual.id].name,
							variant_index,
							links_count,
							variant.title ? variant.title : '- no title -',
							output_links,
							image_url
						));
					}
					else {
						output_library.push(sprintf(
							'<div class="item item-text item-text-raw"><div class="meta">[%s] %s V%s</div><div class="data"><pre></pre></div></div>',
							plugin.actual.id,
							plugin.cache.issue.library.texts[plugin.actual.id].name,
							variant_index,
							'Loading...'
						));

						text_url = sprintf(
							'https://api.klan2016.cz/%s/texts/%s/%03d/%s.txt',
							plugin.actual.issue,
							plugin.actual.index,
							plugin.actual.id,
							variant_index
						);

						$.get(
							text_url,
							function(data) {
								$('.item-text-raw pre', plugin.wrappers.main).html(data);
							}
						);
					}
				});
			}

			if (
				plugin.actual.library == 'arklanoid' ||
				plugin.actual.library == 'help' ||
				plugin.actual.library == 'index' ||
				plugin.actual.library == 'music' ||
				plugin.actual.library == 'screensaver' ||
				plugin.actual.library == 'video'
			) {
				output_library.push('TODO :-)');
			}

			// render

			output += sprintf(
				'%s',
				output_library.join('')
			);

			plugin.wrappers.main.html(output);

			// post-render

			if (plugin.actual.library == 'audio') {
				$('.waveform', plugin.wrappers.main).each(function() {
					var waveform = $(this);
					var wave_index = waveform.data('index');
					var wave_url = waveform.data('url');
					var controls = $(sprintf('#controls-%s', wave_index), plugin.wrappers.main);

					plugin.actual.waveforms[wave_index] = WaveSurfer.create({
						container: sprintf('#waveform-%s', wave_index)
					});
					plugin.actual.waveforms[wave_index].load(wave_url);
					plugin.actual.waveforms[wave_index].on('ready', function() {
						plugin.actual.waveforms[wave_index].on('finish', function() {
							plugin.actual.waveforms[wave_index].stop();
						});

						$('.button-playpause', controls).on('click', function() {
							plugin.actual.waveforms[wave_index].playPause();
						});
						$('.button-stop', controls).on('click', function() {
							plugin.actual.waveforms[wave_index].stop();
						});

						$('.loader', controls).hide();
						$('button', controls).show();
					});
				});
			}

			if (plugin.actual.library == 'images') {
				$('.item-image a', plugin.wrappers.main).each(function() {
					var image_link = $(this);

					image_link.on('click', function() {
						hasher.replaceHash(image_link[0].href.replace('#/', ''));
					});
				});
			}

			if (
				plugin.actual.library == 'screens' &&
				plugin.actual.id
			) {
				var screen = $.klan.api.issue.screens(plugin.actual.issue, plugin.actual.index, plugin.actual.id);

				$(sprintf('.screen')).JSONView(
					JSON.stringify(screen),
					{ 'collapsed': false, 'recursive_collapser': true }
				);
			}

			if (
				plugin.actual.library == 'texts' &&
				plugin.actual.id
			) {
				$.each(plugin.cache.issue.library.texts[plugin.actual.id].variants, function(variant_index, variant) {
					if (variant_index <= 1) {
						if (variant.links) {
							var links = $.klan.api.issue.texts(plugin.actual.issue, plugin.actual.index, plugin.actual.id, variant_index);

							$.each(links, function(link_index, link) {
								$(sprintf('#link-content-%s-%s', variant_index, link_index)).JSONView(
									JSON.stringify(link),
									{ 'collapsed': false, 'recursive_collapser': true }
								);
							});
						}

						$(sprintf('#text-%s-%s .links-toggle', plugin.actual.id, variant_index), plugin.wrappers.main).on('click', function() {
							$(sprintf('#text-%s-%s .links', plugin.actual.id, variant_index), plugin.wrappers.main).toggle();
						});
					}
				});
			}
		}

		if (
			plugin.actual.library == 'images' &&
			plugin.actual.id
		) {
			var image = $(sprintf('#image-%s img', plugin.actual.id));

			if (!Utils.isElementInView(image, false)) {
				$('html, body').scrollTop(image.offset().top);
			}

			$.featherlight(
				sprintf(
					image.data('original'),
					plugin.actual.issue,
					plugin.actual.index,
					plugin.actual.id
				),
				{
					type: 'image',
					openSpeed: 0,
					closeSpeed: 0,
					afterContent: function(event) {
						if (image.attr('alt')) {
							$(sprintf('<div class="title" style="width:%spx;">', image.data('original-width'))).text(image.attr('alt')).prependTo(this.$instance.find('.featherlight-content'));
						}
					},
					afterClose: function(event) {
						hasher.replaceHash(sprintf('%s/%s/%s', plugin.actual.issue, plugin.actual.library, plugin.actual.index));
					}
				}
			);
		}
	}



	var library_clear = function() {
		var output = '';
 
		$.each(plugin.actual.waveforms, function(waveform_index, waveform) {
			waveform.destroy();
		});
		plugin.actual.waveforms = {};

		plugin.wrappers.main.html(output);

		$(window).scrollTop(0);
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
