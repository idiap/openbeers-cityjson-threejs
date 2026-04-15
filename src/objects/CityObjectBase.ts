//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
//
// SPDX-License-Identifier: Apache-2.0
//

// ---


import { 
    Mesh,
    Intersection,
    BufferGeometry,
    InstancedBufferGeometry
 } from "three";
import { IntersectionInfo } from './IntersectionInfo'
import { CityObjectsBaseMaterial } from "../materials/CityObjectsBaseMaterial";

// ---

export class CityObjectBase extends Mesh {

    is_city_object: boolean
    
    constructor ( 
        geometry: BufferGeometry | InstancedBufferGeometry,
        material: CityObjectsBaseMaterial
    ) { 
        super( geometry, material );
        this.is_city_object = true;
    }

    resolve_intersection_info(
        intersection: Intersection,
        city_objects_ids: Array<string>
    ) : IntersectionInfo | null {
        return null;
    }

}

// ---
