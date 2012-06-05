(function ($, _, Backbone, Strophe) {

    Strophe.addConnectionPlugin('vCard', {
        _connection: null,

        init: function (conn) {
            this._connection = conn;
            Strophe.addNamespace('vCard', 'vcard-temp');
        },

        // **_buildvCard** builds an XML vCard from an object.
        _buildvCard: function (dict, parent) {
            var builder;
            if (typeof parent === 'undefined') {
                builder = $build('vCard', {xmlns: Strophe.NS.vCard, version: '2.0'});
            } else {
                builder = $build(parent);
            }
            _.each(dict, function (val, key) {
                if (typeof val === 'object') {
                    builder.cnode(this._buildvCard(val, key)).up();
                } else if (val) {
                    builder.c(key, {}, val);
                } else {
                    builder.c(key).up();
                }
            }, this);
            return builder.tree();
        },

        // **_parsevCard** parses a vCard in XML format and returns an object.
        _parsevCard: function (xml) {
            var dict = {},
                self = this,
                jqEl;
            $(xml).children().each(function (idx, el) {
                jqEl = $(el);
                if (jqEl.children().length) {
                    dict[el.nodeName] = self._parsevCard(el);
                } else {
                    dict[el.nodeName] = jqEl.text();
                }
            });
            return dict;
        },

        // **get** returns the parsed vCard of the user identified by `jid`.
        get: function (jid) {
            var d = $.Deferred(),
                self = this,
                iq = $iq({type: 'get', to: jid, id: this._connection.getUniqueId('vCard')})
                    .c('vCard', {xmlns: Strophe.NS.vCard}).tree();

            this._connection.sendIQ(iq, function (response) {
                var result = $('vCard[xmlns="' + Strophe.NS.vCard + '"]', response);
                if (result.length > 0) {
                    d.resolve(self._parsevCard(result));
                } else {
                    d.reject();
                }
            }, d.reject);
            return d.promise();
        },

        // **set** sets the vCard of the authenticated user by parsing `vcard`.
        set: function (vcard) {
            var d = $.Deferred(),
                iq = $iq({type: 'set', id: this._connection.getUniqueId('vCard')})
                    .cnode(this._buildvCard(vcard));
            this._connection.sendIQ(iq, d.resolve, d.reject);
            return d.promise();
        },

        // **base64Image** returns the Base64-encoded image from a `url`.
        base64Image: function (url) {
            var d = $.Deferred(),
                img = new Image();
            $(img).error(d.reject);
            $(img).load(function () {
                var ctx,
                    canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                d.resolve(canvas.toDataURL('image/png'));
            }).attr('src', url);
            return d.promise();
        }
    });

})(this.jQuery, this._, this.Backbone, this.Strophe);
