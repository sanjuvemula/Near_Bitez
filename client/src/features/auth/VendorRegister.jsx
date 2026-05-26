import AuthPage from "./AuthPage.jsx";

const VendorRegister = () => (
  <AuthPage
    mode="register"
    role="vendor"
    alternateHref="/vendor/login"
    alternateText="Already have a vendor account?"
    alternateLabel="Login here"
  />
);

export default VendorRegister;
