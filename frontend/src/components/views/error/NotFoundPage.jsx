import ErrorPage from './ErrorPage.jsx';

export default function NotFoundPage(props) {
  return <ErrorPage kind="404" {...props} />;
}
