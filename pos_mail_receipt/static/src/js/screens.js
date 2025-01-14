/* License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl). */

odoo.define("pos_mail_receipt.screens", function (require) {
    "use strict";

    var screens = require("point_of_sale.screens");
    var rpc = require("web.rpc");
    var core = require("web.core");
    var _t = core._t;

    var ReceiptScreenWidget = screens.ReceiptScreenWidget.include({
        renderElement: function () {
            this._super();
            var self = this;
            this.$(".button.email").click(function () {
                if (!self._locked) {
                    self.email();
                }
            });
        },
        click_next: function () {
            this._super();
            this.$(".button.email").removeClass("highlight");
        },
        email: function () {
            var self = this;
            var email = false;
            var body_from_ui = this.$(".pos-receipt-container").html();
            if (
                this.pos.get_order().get_client() &&
                this.pos.get_order().get_client().email
            ) {
                self._send_email_server(this.pos.get_order().name, {
                    email: this.pos.get_order().get_client().email,
                    body_from_ui: body_from_ui,
                });
            } else {
                this.gui.show_popup("textinput", {
                    title: _t("E-mail address to use"),
                    value: "",
                    confirm: function (value) {
                        self._send_email_server(self.pos.get_order().name, {
                            email: value,
                            body_from_ui: body_from_ui,
                        });
                    },
                });
            }
        },
        // ask the server to send the ticket as e-mail
        // available options:
        // - timeout: timeout for the rpc call in ms
        // - email: email to use instead of the partner's
        // returns a deferred
        _send_email_server: async function (order, options) {
            var self = this;
            options = options || {};
            var timeout =
                typeof options.timeout === "number" ? options.timeout : 7500;
            var i = 0;
            var waiting_interval = 1000;
            self.lock_screen(true);
            while (self.pos.get("synch").state == "connecting") {
                await sleep(waiting_interval);
                i = i + waiting_interval;
                if (i >= timeout) {
                    self.gui.show_popup(
                        "error",
                        _t(
                            "Synchronisation with the database is taking too long. Retry or contact the system administrator."
                        )
                    );
                    self.lock_screen(false);
                    return;
                }
            }
            return rpc
                .query(
                    {
                        model: "pos.order",
                        method: "send_mail_receipt",
                        args: [
                            order,
                            options["email"],
                            options["body_from_ui"],
                        ],
                    },
                    {
                        timeout: timeout,
                    }
                )
                .then(function (result) {
                    self.$(".button.email").addClass("highlight");
                    return true;
                })
                .fail(function (type, error) {
                    var connection_problem = true;
                    for (var i = 0; i < self.pos.db.get_orders().length; i++) {
                        if (order == self.pos.db.get_orders()[i].data.name) {
                            self.pos.db.get_orders()[i].data["email"] =
                                options["email"] || false;
                            self.pos.db.get_orders()[i].data["body_from_ui"] =
                                options["body_from_ui"] || false;
                            connection_problem = false;
                        }
                    }
                    if (error.code === 200) {
                        // Business Logic Error, not a connection problem
                        //if warning do not need to display traceback!!
                        if (error.data.exception_type == "warning") {
                            delete error.data.debug;
                        }

                        self.gui.show_popup("error-traceback", {
                            title: error.data.message,
                            body: error.data.debug,
                        });
                    }
                    if (connection_problem) {
                        self.gui.show_popup("error", {
                            title: _t("The e-mail could not be sent"),
                            body:
                                _t("The e-mail could not be sent to ") +
                                options["email"] +
                                _t(
                                    ". Check your internet connection and try again."
                                ),
                        });
                    }
                    self.gui.show_popup(
                        "error",
                        _t("Error sending the mail receipt")
                    );
                })
                .always(function () {
                    self.lock_screen(false);
                });
        },
    });
});

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
