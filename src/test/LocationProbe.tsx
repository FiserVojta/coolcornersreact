import { useLocation } from 'react-router-dom';

/** Renders the current router search string so tests can assert URL state. */
export const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
};

export const currentSearchParams = (element: HTMLElement) => new URLSearchParams(element.textContent ?? '');
