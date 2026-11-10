export function resolveSignInGateState(input) {
    if (input.isPending)
        return "pending";
    return input.hasUser ? "signed_in" : "signed_out";
}
