/* =============================================================================
 * Scripted REST API resource — GET alumni placements (company logos)
 * =============================================================================
 * Returns every record from the placements table as a clean JSON list. Each
 * item carries the company name and its logo as a base64 data URI, so the
 * public web page can render the logos directly with no second request.
 * No authentication, no credentials.
 *
 * DEPLOY AS:
 *   Scripted REST API : Team Profiles  (x_palni_servicen_1 scope)
 *   Operation         : Get Placements
 *   HTTP method       : GET
 *   Relative path     : /get_placements
 *   Full URL          : /api/x_palni_servicen_1/team_profiles/get_placements
 *
 * REQUIRED OPERATION SETTINGS (all OFF for anonymous public access):
 *        Requires authentication      : OFF
 *        Requires ACL authorization   : OFF
 *        Requires snc_internal role   : OFF   <- defaults to true; blocks guest
 *
 * CORS: covered by the existing "TeamProfile" CORS rule on the Team Profiles
 * REST API (allows the GitHub Pages domain, GET + POST).
 *
 * TABLE  : x_palni_servicen_1_placements
 * FIELDS : name (company), profile_picture (image — stored as an attachment)
 * ===========================================================================*/
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var TABLE = 'x_palni_servicen_1_placements';
    var out = [];

    // Company-name column varies by table — use the first non-empty of these.
    var NAME_FIELDS = ['name', 'u_name', 'u_company', 'u_company_name', 'company', 'short_description', 'u_short_description'];

    var gr = new GlideRecord(TABLE);
    gr.query();
    while (gr.next()) {
        out.push({
            sys_id:          gr.getUniqueValue(),
            name:            companyName(gr),
            profile_picture: imageDataUri(gr)   // '' if none
        });
    }

    function companyName(rec) {
        for (var i = 0; i < NAME_FIELDS.length; i++) {
            if (rec.isValidField(NAME_FIELDS[i])) {
                var v = rec.getDisplayValue(NAME_FIELDS[i]);
                if (v) return v;
            }
        }
        return '';
    }

    response.setStatus(200);
    response.setHeader('Content-Type', 'application/json');
    response.getStreamWriter().writeString(JSON.stringify({ result: out }));

    /* ---- Read the record's image and return a base64 data URI -------------
     * "profile_picture" is an IMAGE-type field, so its binary is NOT attached
     * to the placement record directly — it lives on the db_image record whose
     * sys_id is stored in the field value (same as course/trainer photos).
     * We therefore look in two places, in order:
     *   1) any image attachment on the placement record itself, then
     *   2) the attachment behind the db_image referenced by profile_picture. */
    function imageDataUri(rec) {
        var uri = dataUriFor(rec.getUniqueValue());                  // 1) record attachment
        if (!uri && rec.isValidField('profile_picture')) {
            uri = dataUriFor(rec.getValue('profile_picture'));       // 2) db_image (Image field)
        }
        return uri;
    }

    function dataUriFor(tableSysId) {
        if (!tableSysId) return '';
        var a = new GlideRecord('sys_attachment');
        a.addQuery('table_sys_id', tableSysId);
        a.orderByDesc('sys_created_on');
        a.query();
        while (a.next()) {
            var ct = ('' + a.getValue('content_type')).toLowerCase();
            var fn = ('' + a.getValue('file_name')).toLowerCase();
            var isImg = ct.indexOf('image') === 0 ||
                        /\.(png|jpe?g|gif|svg|webp)$/.test(fn) ||
                        fn.indexOf('profile_picture') > -1;
            if (!isImg) continue;
            try {
                var bytes = new GlideSysAttachment().getBytes(a);     // byte[]
                if (bytes && bytes.length) {
                    return 'data:' + (ct || 'image/png') + ';base64,' +
                           GlideStringUtil.base64EncodeByteArray(bytes);
                }
            } catch (e) { /* skip unreadable attachment */ }
        }
        return '';
    }

})(request, response);
