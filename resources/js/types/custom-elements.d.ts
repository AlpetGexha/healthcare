// Declare the custom spline-viewer element for TypeScript
import React from 'react';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            ['spline-viewer']: React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement> & {
                    url?: string;
                },
                HTMLElement
            >;
        }
    }
}
