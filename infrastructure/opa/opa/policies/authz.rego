package authz

default allow = false

allow if {
    input.role == "admin"
    input.tenant == input.resource_tenant
}

allow if {
    input.role == "user"
    input.tenant == input.resource_tenant
    input.action == "read"
}