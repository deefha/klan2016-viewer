(function($) {

$.featherlight.prototype.resize = function(w, h) {
	if (w && h) {
		/* Reset apparent image size first so container grows */
		this.$content.css('width', '').css('height', '');

		/* Rescale only if the image does not fit in the window */
		if (this.$content.parent().width() < w || this.$content.parent().height() < h) {
			/* Calculate the worst ratio so that dimensions fit */
			/* Note: -1 to avoid rounding errors */
			var ratio = Math.max(
				w  / (this.$content.parent().width()-1),
				h / (this.$content.parent().height()-1)
			);
			/* Resize content */
			if (ratio > 1) {
				ratio = h / Math.floor(h / ratio); /* Round ratio down so height calc works */
				this.$content.css('width', '' + w / ratio + 'px').css('height', '' + h / ratio + 'px');
			}
		}
	}
};

if ($('#klan-app-viewer').length && !!$.prototype.klan_app_viewer) {
	$('#klan-app-viewer').klan_app_viewer();
}

})(jQuery);
