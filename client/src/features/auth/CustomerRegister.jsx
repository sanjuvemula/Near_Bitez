import AuthPage from "./AuthPage.jsx";

const CustomerRegister = () => (
  <AuthPage
    mode="register"
    role="customer"
    alternateHref="/customer/login"
    alternateText="Already have a customer account?"
    alternateLabel="Login here"
  />
);

export default CustomerRegister;
