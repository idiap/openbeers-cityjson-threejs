//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
// SPDX-FileContributor: Stelios Vitalis (from cityjson-threejs-loader)
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

import { Group, Matrix4, Box3, BufferGeometry, BufferAttribute, Vector3 } from "three";
import { CityJSONWorkerParser } from "../parsers/CityJSONWorkerParser";
import { CityJSONParser } from "../parsers/CityJSONParser";
import { CityModel } from "openbeers";

// ---

export class CityJSONLoader {

    scene: Group;
    matrix: Matrix4 | null;
    bounding_box: Box3 | null;
    parser: CityJSONWorkerParser | CityJSONParser;

    constructor( parser: CityJSONWorkerParser | CityJSONParser ) {
		this.scene = new Group();
		this.matrix = null;
		this.bounding_box = null;
		this.parser = parser || new CityJSONWorkerParser();
	}

    load_city_model ( city_model : CityModel ) : void {
        // We shallow clone the object to avoid modifying the original
        // the original objects vertices
        const new_city_model = Object.assign( {}, city_model );
        // new_city_model.vertices = this.applyTransform( city_model );
        const transform = new Matrix4().identity();
        if ( city_model.transform != null ) {
            const t = city_model.transform.translate;
            const s = city_model.transform.scale;
            transform.set(
                s[ 0 ], 0, 0, t[ 0 ],
                0, s[ 1 ], 0, t[ 1 ],
                0, 0, s[ 2 ], t[ 2 ],
                0, 0, 0, 1
            );
        }
        if ( this.matrix == null ) {
            this.compute_matrix( new_city_model );
            this.matrix = transform;
            this.matrix.setPosition( 0, 0, 0 );
        }
        this.parser.matrix = this.matrix;
        this.parser.parse( new_city_model, this.scene );
    }
	
    apply_transform ( city_model : CityModel ) : number[][] | undefined {
        if (
            city_model.vertices && 
            city_model.transform != null 
        ) {
            const t = city_model.transform.translate;
            const s = city_model.transform.scale;
            const vertices = city_model.vertices.map( v =>
                [
                    v[ 0 ] * s[ 0 ] + t[ 0 ],
                    v[ 1 ] * s[ 1 ] + t[ 1 ],
                    v[ 2 ] * s[ 2 ] + t[ 2 ]
                ]
            );
            return vertices;
        }
        return city_model.vertices;
    }

    compute_matrix ( city_model : CityModel ) : void {
        if ( city_model.vertices ) {
            const buffer_geometry = new BufferGeometry();
            const vertices = new Float32Array( city_model.vertices.map( v => [ v[ 0 ], v[ 1 ], v[ 2 ] ] ).flat() );
            buffer_geometry.setAttribute( 'position', new BufferAttribute( vertices, 3 ) );
            buffer_geometry.computeBoundingBox();
            this.bounding_box = buffer_geometry.boundingBox;
            const centre = new Vector3();
            if ( this.bounding_box != null ) {
                this.bounding_box.getCenter( centre );
                centre.setZ( 0 );
                const s = 1;
                const matrix = new Matrix4();
                matrix.set(
                    s, 0, 0, - s * centre.x,
                    0, s, 0, - s * centre.y,
                    0, 0, s, - s * centre.z,
                    0, 0, 0, 1
                );
                this.matrix = matrix;
            }
        }
    }
}

// ---
