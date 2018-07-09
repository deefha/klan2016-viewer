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
	plugin.locks = {}
	plugin.flags = {}

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
				// TODO main_clear
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

		if (plugin.actual.library == 'fonts') {
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
						'<div class="item item-image%s"><div class="meta">[%s] %sx%s</div><div class="data">%s<img src="%s" style="margin-top:%spx;" />%s</div></div>',
						image_zoom ? ' zoom' : '',
						image_index,
						image.width,
						image.height,
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



	// ******************************************* screen *******************************************
	var screen_load = function() {
		$.when.all([
			$.klan.api.issue.screens(plugin.actual.issue, plugin.actual.screen)
		]).done(function(responses) {
			plugin.cache.issue.screen = responses[0];

			log(sprintf('screen s:%s, type_1:%s', plugin.actual.screen, plugin.cache.issue.screen.type_1), '>>');

			if (plugin.cache.issue.screen.type_1 == 0) {
				plugin.engine.events = {};
				plugin.engine.screen = null;
				plugin.engine.buttons = {};
				plugin.engine.ads = {};
				plugin.engine.text = null;
			}

			log(sprintf('events s:%s', plugin.actual.screen), '>>');
			$.each(plugin.cache.issue.screen.events, function(event_index, event) {
				log_macro(sprintf('s:%s, e:%s, b:%s', plugin.actual.screen, event_index, event.binding), event.macros);
				plugin.engine.events[event.binding] = event.macros;
			});
			log(sprintf('events s:%s', plugin.actual.screen), '<<');

			log(sprintf('macros s:%s', plugin.actual.screen), '>>');
			$.each(plugin.cache.issue.screen.macros, function(macro_index, macro) {
				parse_macro(macro, macro_index);
			});
			log(sprintf('macros s:%s', plugin.actual.screen), '<<');

			log(sprintf('screen s:%s', plugin.actual.screen), '<<');

			log_scroll();
		});
	}



	var screen_render = function(force) {
		force = (typeof force === 'undefined') ? false : force;

		if (force) {
			log('rendering', '>>');

			plugin.wrappers.display.empty();

			if (plugin.engine.screen) {
				plugin.wrappers.display.append(sprintf(
					'<div class="component screen" style="background-image:url(https://api.klan2016.cz/%s/images/0/%04d.png)"></div>',
					plugin.actual.issue,
					plugin.engine.screen.id
				));
			}

			if (plugin.engine.text) {
				plugin.wrappers.display.append(sprintf(
					'<div id="component-%s-text" class="component text" style="width:%spx;height:%spx;left:%spx;top:%spx;"><img src="https://api.klan2016.cz/%s/texts/0/%03d/0.png" /></div>',
					plugin.actual.screen,
					plugin.engine.text.area.width + 30,
					plugin.engine.text.area.height,
					plugin.engine.text.area.topleft_x,
					plugin.engine.text.area.topleft_y,
					plugin.actual.issue,
					plugin.engine.text.content.startsWith('^') ?
						plugin.cache.issue.texts_indexed[plugin.engine.svars[plugin.engine.text.content.substr(1)]] :
						plugin.cache.issue.texts_indexed[plugin.engine.text.content]
				));

				$(sprintf(
					'#component-%s-text',
					plugin.actual.screen
				))
				.mCustomScrollbar({
					scrollInertia: 0,
					snapAmount: 12,
					mouseWheel: {
						enable: true,
						scrollAmount: 24
					},
					scrollButtons: {
						enable: false,
						scrollAmount: 24
					},
					keyboard: {
						enable: true,
						scrollAmount: 24
					}
				});
			}

			$.each(plugin.engine.buttons, function(button_index, button) {
				var image = plugin.cache.issue.images[button.image];

				plugin.wrappers.display.append(sprintf(
					'<div id="component-%s-%s" data-id="%s" class="component button" style="width:%spx;height:%spx;left:%spx;top:%spx;background-image:url(https://api.klan2016.cz/%s/images/0/%04d.png);"></div>',
					plugin.actual.screen,
					button.id,
					button.id,
					image.width,
					image.height,
					button.topleft_x,
					button.topleft_y,
					plugin.actual.issue,
					button.image
				));

				if (button.hover_topleft_x || button.hover_topleft_y || button.hover_bottomright_x || button.hover_bottomright_y) {
					plugin.wrappers.display.append(sprintf(
						'<div id="action-%s-%s" data-id="%s" class="action" style="width:%spx;height:%spx;left:%spx;top:%spx;" title="event b:%s"></div>',
						plugin.actual.screen,
						button.id,
						button.id,
						button.hover_bottomright_x - button.hover_topleft_x,
						button.hover_bottomright_y - button.hover_topleft_y,
						button.hover_topleft_x,
						button.hover_topleft_y,
						button.id
					));
				}
				else {
					plugin.wrappers.display.append(sprintf(
						'<div id="action-%s-%s" data-id="%s" class="action" style="width:%spx;height:%spx;left:%spx;top:%spx;" title="event b:%s"></div>',
						plugin.actual.screen,
						button.id,
						button.id,
						image.width,
						image.height,
						button.topleft_x,
						button.topleft_y,
						button.id
					));
				}
			});

			$.each(plugin.engine.ads, function(ad_index, ad) {
				var image = plugin.cache.issue.images[ad.image];

				plugin.wrappers.display.append(sprintf(
					'<div id="component-%s-%s" class="component ad" style="width:%spx;height:%spx;left:%spx;top:%spx;background-image:url(https://api.klan2016.cz/%s/images/0/%04d.png);"></div>',
					plugin.actual.screen,
					ad.id,
					image.width,
					image.height,
					ad.topleft_x,
					ad.topleft_y,
					plugin.actual.issue,
					ad.image
				));

				plugin.wrappers.display.append(sprintf(
					'<div id="action-%s-%s" data-id="%s" class="action" style="width:%spx;height:%spx;left:%spx;top:%spx;" title="e:%s"></div>',
					plugin.actual.screen,
					ad.id,
					ad.id,
					image.width,
					image.height,
					ad.topleft_x,
					ad.topleft_y,
					ad.id
				));
			});

			log('rendering', '<<');
		}

		$('.action').click(function() {
 			log_break();
			run_event($(this).data('id'));
			screen_render(true);
			return false;
		});
	}



	// ******************************************* info *******************************************
	var info_render = function() {
		plugin.wrappers.info.empty();

		plugin.wrappers.info.append(sprintf(
			'<div>* ivars</div>'
		));
		$.each(plugin.engine.ivars, function(ivar_index, ivar) {
			plugin.wrappers.info.append(sprintf(
				'<div>ivar_%s = %s</div>',
				ivar_index,
				ivar
			));
		});

		plugin.wrappers.info.append(sprintf(
			'<div>* svars</div>'
		));
		$.each(plugin.engine.svars, function(svar_index, svar) {
			plugin.wrappers.info.append(sprintf(
				'<div>svar_%s = "%s"</div>',
				svar_index,
				svar
			));
		});

		plugin.wrappers.info.append(sprintf(
			'<div>* screen</div>'
		));
		plugin.wrappers.info.append(sprintf(
			'<div>background = %s</div>',
			plugin.engine.screen ? plugin.engine.screen.id : 'null'
		));

		plugin.wrappers.info.append(sprintf(
			'<div>* text</div>'
		));
		plugin.wrappers.info.append(sprintf(
			'<div>content = "%s"</div>',
			plugin.engine.text ? plugin.engine.text.content : 'null'
		));
	}



	// ******************************************* logging *******************************************
	var log_empty = function() {
		plugin.wrappers.log.empty();
	}



	var log_scroll = function() {
		plugin.wrappers.log.animate({scrollTop: plugin.wrappers.log.get(0).scrollHeight}, 100);
	}



	var log_break = function() {
		log('&nbsp;', '');
	}



	var log = function(string, mark) {
		var mark = typeof mark !== 'undefined' ? mark : '*';

		plugin.actual.log_id = Math.random().toString(36).substring(7);

		$.klan.log(sprintf('[%s] %s %s', plugin.meta.name, mark, string));

		if (mark == '<<') {
			plugin.actual.log_branch--;
		}

		if (plugin.wrappers.log) {
			plugin.wrappers.log.append(sprintf(
				'<div class="log-line-%s" data-id="%s">%s%s %s</div>',
				plugin.actual.log_id,
				plugin.actual.log_id,
				'&nbsp;'.repeat(plugin.actual.log_branch),
				mark,
				string
			));
		}

		if (mark == '>>') {
			plugin.actual.log_branch++;
		}
	}



	var log_macro = function(string, macro, mark) {
		log(string, mark);

		if (plugin.wrappers.log) {
			plugin.wrappers.log.append(sprintf(
				'<div class="log-macro-%s"></div>',
				plugin.actual.log_id
			));

			$(sprintf('.log-macro-%s', plugin.actual.log_id)).JSONView(
				JSON.stringify(macro),
				{ 'collapsed': false, 'recursive_collapser': true }
			).hide();

			$(sprintf('.log-line-%s', plugin.actual.log_id)).addClass('log-macro-toggle');

			$(sprintf('.log-line-%s', plugin.actual.log_id)).click(function() {
				$(sprintf('.log-macro-%s', $(this).data('id'))).toggle();
				return false;
			});
		}
	}



	// ******************************************* locking *******************************************
	var lock = function(id) {
		plugin.locks[id] = true;
	}

	var unlock = function(id) {
		delete plugin.locks[id];
	}

	var locked = function(id) {
		return (typeof id === 'undefined') ?
			(plugin.locks.length ? true : false) :
			plugin.locks[id];
	}



	// ******************************************* flagging *******************************************
	var flag = function(id, flag) {
		if (typeof plugin.flags[id] === 'undefined') {
			plugin.flags[id] = {}
		}
		plugin.flags[id][flag] = true;
	}

	var unflag = function(id, flag) {
		if (typeof plugin.flags[id] === 'undefined') {
			plugin.flags[id] = {}
		}
		plugin.flags[id][flag] = false;
	}

	var flagged = function(id, flag) {
		return (typeof plugin.flags[id] === 'undefined' ?
			false :
			plugin.flags[id][flag]
		);
	}



	// ******************************************* helpers *******************************************
	var parse_macro = function(macro, macro_index) {
		var log_base = sprintf('s:%s, m:%s, t:%s', plugin.actual.screen, macro_index, macro.type);

		if (macro.type == 'button') {
			if (macro.params.id < 32768) {
				log_macro(sprintf('%s&nbsp; &nbsp;id = %s', log_base, macro.params.id), macro);
				plugin.engine.buttons[macro.params.id] = macro.params;
			}
			else {
				var macro_params_id = 65536 - macro.params.id;
				log_macro(sprintf('%s&nbsp; &nbsp;id = %s[ivar_%s=>%s]', log_base, macro.params.id, macro_params_id, plugin.engine.ivars[macro_params_id]), macro);
// 				plugin.engine.buttons[plugin.engine.ivars[macro_params_id]] = macro.params;
			}
		}

		else if (macro.type == 'event') {
			log_macro(sprintf('%s&nbsp; &nbsp;binding = %s', log_base, macro.params.id), macro);
			run_event(macro.params.id);
		}

		else if (macro.type == 'gotopage') {
			if (macro.params.id < 32768) {
				log_macro(sprintf('%s&nbsp; &nbsp;id = %s', log_base, macro.params.id), macro);
				plugin.actual.screen = macro.params.id;
			}
			else {
				log_macro(sprintf('%s&nbsp; &nbsp;id = %s[%s=>%s]', log_base, macro.params.id, 65536 - macro.params.id, plugin.engine.ivars[65536 - macro.params.id]), macro);
				plugin.actual.screen = plugin.engine.ivars[65536 - macro.params.id];
			}
			screen_load();
		}

		else if (macro.type == 'if') {
			var value_1 = macro.params.branches.branch_if.value_1;
			var value_2 = macro.params.branches.branch_if.value_2;
			var condition = null;

			var log_value_1 = value_1;
			var log_value_2 = value_2;
			var log_condition = sprintf('<span style="color:red;">%s?</span>', macro.params.branches.branch_if.condition);

			if (macro.params.branches.branch_if.value_1 >= 32768) {
				value_1 = plugin.engine.ivars[65536 - macro.params.branches.branch_if.value_1];
				log_value_1 = sprintf(
					'%s[ivar_%s=>%s]',
					macro.params.branches.branch_if.value_1,
					65536 - macro.params.branches.branch_if.value_1,
					value_1
				);
			}

			if (macro.params.branches.branch_if.condition == 1) {
				condition = (value_1 == value_2);
				log_condition = '==';
			}
			else if (macro.params.branches.branch_if.condition == 3) {
				condition = (value_1 != value_2);
				log_condition = '<span style="color:red;">!=?</span>';
			}

			log_macro(
				sprintf(
					'%s&nbsp; &nbsp;%s %s %s%s',
					log_base,
					log_value_1,
					log_condition,
					log_value_2,
					macro.params.branches.branch_else ? ' ... else' : ''
				),
				macro
			);
			if (condition) {
				log(sprintf('macros m:%s, if', macro_index), '>>');
				$.each(macro.params.branches.branch_if.macros, function(branch_macro_index, branch_macro) {
					parse_macro(branch_macro, branch_macro_index);
				});
				log(sprintf('macros m:%s, if', macro_index), '<<');
			}
			else if (macro.params.branches.branch_else) {
				log(sprintf('macros m:%s, else', macro_index), '>>');
				$.each(macro.params.branches.branch_else.macros, function(branch_macro_index, branch_macro) {
					parse_macro(branch_macro, branch_macro_index);
				});
				log(sprintf('macros m:%s, else', macro_index), '<<');
			}
		}

		else if (macro.type == 'ivar/mov') {
			log_macro(
				sprintf(
					'%s&nbsp; &nbsp;ivar_%s = %s%s',
					log_base,
					macro.params.
					variable,
					typeof plugin.engine.ivars[macro.params.variable] !== 'undefined' ?
						sprintf('%s=>', plugin.engine.ivars[macro.params.variable]) :
						'',
					macro.params.value
				),
				macro
			);
			plugin.engine.ivars[macro.params.variable] = macro.params.value;
		}

		else if (macro.type == 'keybutt') {
			log_macro(sprintf('%s&nbsp; &nbsp;TODO', log_base), macro);
			// TODO
		}

		else if (macro.type == 'reklama') {
			log_macro(sprintf('%s&nbsp; &nbsp;id = %s', log_base, macro.params.id), macro);
			plugin.engine.ads[macro.params.id] = macro.params;
		}

		else if (macro.type == 'screen') {
			log_macro(sprintf('%s&nbsp; &nbsp;background = %s', log_base, macro.params.id), macro);
			plugin.engine.screen = macro.params;
		}

		else if (macro.type == 'separator') {
			// PASS
		}

		else if (macro.type == 'svar') {
			log_macro(
				sprintf(
					'%s&nbsp; &nbsp;svar_%s = %s"%s"',
					log_base,
					macro.params.variable,
					typeof plugin.engine.svars[macro.params.variable] !== 'undefined' ?
						sprintf('"%s"=>', plugin.engine.svars[macro.params.variable]) :
						'',
					macro.params.value
				),
				macro
			);
			plugin.engine.svars[macro.params.variable] = macro.params.value;
		}

		else if (macro.type == 'text') {
			log_macro(sprintf('%s&nbsp; &nbsp;content = "%s"', log_base, macro.params.content), macro);
			plugin.engine.text = macro.params;
		}

		else if (macro.type == 'woknoshit') {
			log_macro(sprintf('%s&nbsp; &nbsp;TODO', log_base), macro);
			screen_render(true);
		}

		else if (macro.type == 'snap') {
			log_macro(sprintf('%s&nbsp; &nbsp;foo = %s TODO', log_base, macro.params.foo), macro);
		}

		else {
			log_macro(sprintf('%s&nbsp; &nbsp;UNKNOWN MACRO', log_base), macro);
		}

		info_render();
	}



	var run_event = function(event_id) {
		log(sprintf('event b:%s', event_id), '>>');

		if (event_id) {
			log(sprintf('macros e:%s', event_id), '>>');
			$.each(plugin.engine.events[event_id], function(event_macro_index, event_macro) {
				parse_macro(event_macro, event_macro_index);
			});
			log(sprintf('macros e:%s', event_id), '<<');
		}
		else {
			log('Exit to DOS :-)');
			alert('Exit to DOS :-)');
		}

		log(sprintf('event b:%s', event_id), '<<');

		log_scroll();
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
