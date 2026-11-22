// SGY: WCAG 1.4.13 – Global ESC handler + iframe focus handling for tooltips.
// Runs once at script load (before behaviors) so it covers all tooltip types.
(function() {
  // Global fallback: dismiss any .tipsy element on ESC and reset tipsy state.
  // Capture-phase fires before Popups.keyHandle so modals stay open.
  var escHandler = function(e) {
    if (e.keyCode === 27 || e.key === 'Escape') {
      var tips = document.querySelectorAll('.tipsy');
      if (tips.length) {
        if (typeof jQuery !== 'undefined') {
          jQuery('.infotip, .s_cluetip_highlight, [original-title]').each(function() {
            var d = jQuery.data(this, 'tipsy');
            if (d) {
              d.hoverState = 'out';
              if (d.$tip) { d.$tip.remove(); d.$tip = null; }
            }
          });
        }
        for (var i = 0; i < tips.length; i++) {
          if (tips[i].parentNode) tips[i].parentNode.removeChild(tips[i]);
        }
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }
  };
  document.addEventListener('keydown', escHandler, true);

  // When hovering over an infotip while an iframe has focus (e.g. WYSIWYG
  // editors on Groups/Courses), the parent document won't receive keydown
  // events. Reclaim focus so ESC works immediately.
  document.addEventListener('mouseover', function(e) {
    var el = e.target.closest && e.target.closest('.infotip, .s_cluetip_highlight');
    if (el && document.activeElement && document.activeElement.tagName === 'IFRAME') {
      document.body.focus();
    }
  }, true);

  // Install ESC handler inside editor iframes so ESC works even with
  // the editor focused. Covers both existing and dynamically added iframes.
  var installInIframe = function(iframe) {
    try {
      var doc = iframe.contentDocument || iframe.contentWindow.document;
      if (doc && !doc._sgyEscBound) {
        doc._sgyEscBound = true;
        doc.addEventListener('keydown', function(e) {
          if (e.keyCode === 27 || e.key === 'Escape') {
            var tips = iframe.ownerDocument.querySelectorAll('.tipsy');
            if (tips.length) {
              for (var i = 0; i < tips.length; i++) {
                if (tips[i].parentNode) tips[i].parentNode.removeChild(tips[i]);
              }
              e.stopImmediatePropagation();
              e.preventDefault();
            }
          }
        }, true);
      }
    } catch(err) {}
  };

  var observer = new MutationObserver(function(mutations) {
    for (var m = 0; m < mutations.length; m++) {
      var nodes = mutations[m].addedNodes;
      for (var n = 0; n < nodes.length; n++) {
        if (nodes[n].tagName === 'IFRAME') {
          nodes[n].addEventListener('load', function() { installInIframe(this); });
        }
        if (nodes[n].querySelectorAll) {
          var iframes = nodes[n].querySelectorAll('iframe');
          for (var f = 0; f < iframes.length; f++) {
            iframes[f].addEventListener('load', function() { installInIframe(this); });
          }
        }
      }
    }
  });

  var root = document.body || document.documentElement;
  if (root) {
    observer.observe(root, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  window.addEventListener('load', function() {
    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) { installInIframe(iframes[i]); }
  });
})();

Drupal.behaviors.sCommonInfotip = function(context){
  $('span.infotip:not(.sCommonInfotip-processed), button.infotip:not(.sCommonInfotip-processed), a.infotip:not(.sCommonInfotip-processed)', context)
  .addClass('sCommonInfotip-processed').each(function(){
    var infotipObj = $(this);
    var triggerMode = infotipObj.hasClass('manual') ? 'manual' : 'hover';

    infotipObj.tipsy({
      html: true,
      gravity: infotipObj.attr('tipsygravity'),
      trigger: triggerMode,
      delayIn: 500,
      title: function(){
        return $('.infotip-content', $(this)).html();
      }
    });
    // Add ESC key support
    infotipObj.on('keydown', function(e) {
      if (isEscapeKeyEvent(e)) {
        $(this).tipsy('hide');           
        e.preventDefault();
        e.stopPropagation();             
      }
    });

    // tipsy unconditionally sets tabindex=0 on every .infotip element.
    // When an infotip has no visible trigger text (only the hidden .infotip-content
    // tooltip text) but *does* contain another focusable descendant (e.g., a link or
    // button that should receive focus), the wrapper becomes a phantom tab stop with
    // no focus indicator.
    // In that specific case, re-apply tabindex="-1" after tipsy to remove the wrapper
    // from the tab order, while leaving the inner focusable element accessible.
    var $clone = infotipObj.clone();
    $clone.children('.infotip-content').remove();
    var visibleText = $clone.text().trim();
    if (!visibleText) {
      var $focusableDescendants = infotipObj.find('a, button, input, select, textarea, [tabindex]').filter(':visible');
      if ($focusableDescendants.length > 0) {
        infotipObj.attr('tabindex', '-1').removeAttr('role');
      }
    }
  });

  $('.s_cluetip_highlight:not(.sCommonInfotip-processed)', context).add('sCommonInfotip-processed').each(function(){
    var object = $(this);
    if(object.attr('cluetip')){
      object.tipsy({
        html: false,
        delayIn: 500,
        title: function(){
          return Base64.decode(object.attr('cluetip'));
        }
      });
    }
  });
}
