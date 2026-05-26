import AuthPage from "./AuthPage.jsx";

const VendorLogin = () => (
  <AuthPage
    mode="login"
    role="vendor"
    alternateHref="/vendor/register"
    alternateText="Need a vendor account?"
    alternateLabel="Register here"
  />
);

export default VendorLogin;
