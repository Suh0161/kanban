import ErrorPage from './ErrorPage.jsx';

export default function ForbiddenPage(props) {
  return <ErrorPage kind="403" {...props} />;
}
