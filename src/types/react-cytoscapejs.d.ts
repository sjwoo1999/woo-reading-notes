declare module 'react-cytoscapejs' {
  import type { ComponentType, CSSProperties } from 'react';
  import type cytoscape from 'cytoscape';

  export interface CytoscapeComponentProps {
    cy?: (cy: cytoscape.Core) => void;
    elements?: cytoscape.ElementsDefinition | any;
    style?: CSSProperties;
    layout?: any;
    stylesheet?: cytoscape.Stylesheet[] | any;
    className?: string;
    id?: string;
    [key: string]: any;
  }

  const CytoscapeComponent: ComponentType<CytoscapeComponentProps>;
  export default CytoscapeComponent;
}


