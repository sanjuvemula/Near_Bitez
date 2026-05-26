import AuthPage from "./AuthPage.jsx";

const CustomerLogin = () => (
  <AuthPage
    mode="login"
    role="customer"
    alternateHref="/customer/register"
    alternateText="Need a customer account?"
    alternateLabel="Register here"
  />
);

export default CustomerLogin;
