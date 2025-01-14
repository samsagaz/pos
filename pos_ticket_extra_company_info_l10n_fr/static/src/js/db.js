/*
Copyright (C) 2023-Today: GRAP (<http://www.grap.coop/>)
@author: Sylvain LE GAL (https://twitter.com/legalsylvain)
License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
*/

odoo.define('pos_ticket_extra_company_info_l10n_fr.db', function (require) {
    "use strict";

    var models = require('point_of_sale.models');

    models.load_fields("res.company", ['siret']);
});
