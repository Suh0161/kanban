import ErrorPage from './ErrorPage.jsx';

export default function ServerErrorPage(props) {
  return <ErrorPage kind="500" {...props} />;
}
