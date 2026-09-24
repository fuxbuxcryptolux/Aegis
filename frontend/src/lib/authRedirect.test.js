import { getAuthRedirectUrl } from "./authRedirect";

test("uses the browser origin for auth redirects", () => {
  window.history.pushState({}, "", "/?mode=sideview");

  expect(getAuthRedirectUrl()).toBe(window.location.origin);
});