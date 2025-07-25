"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
const domains_js_1 = require("../../components/domains.js");
const dns_js_1 = require("../../components/dns.js");
const certs_js_1 = require("../../components/certs.js");
const aliases_js_1 = require("../../components/aliases.js");
async function register(server) {
    (0, domains_js_1.registerDomainTools)(server);
    (0, dns_js_1.registerDnsTools)(server);
    (0, certs_js_1.registerCertTools)(server);
    (0, aliases_js_1.registerAliasTools)(server);
    return [
        "add_domain",
        "remove_domain",
        "get_domain",
        "list_domains",
        "mcp_domains",
        "domain_check",
        "domain_price",
        "domain_config",
        "domain_registry",
        "domain_get",
        "domain_list",
        "domain_buy",
        "domain_register",
        "domain_remove",
        "domain_update",
        "mcp_registry",
        "create_dns_record",
        "delete_dns_record",
        "list_dns_records",
        "update_dns_record",
        "mcp_dns",
        "get_cert",
        "issue_cert",
        "remove_cert",
        "upload_cert",
        "mcp_certificate",
        "assign_alias",
        "delete_alias",
        "get_alias",
        "list_aliases",
        "list_deployment_aliases",
        "mcp_alias"
    ];
}
//# sourceMappingURL=index.js.map