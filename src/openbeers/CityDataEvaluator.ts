//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

import { 
    BufferAttribute, 
    Int32BufferAttribute, 
    InterleavedBufferAttribute 
} from "three";
import { color_map_value } from "../materials/color_map";
import { CityDatum } from "./CityDatum";
import { 
    CityObject, 
    TimeSeriesInfo 
} from "openbeers";
import { CityZone } from "./CityZone";

// ---

export interface DataColor {
    [name: number]: number
}

// ---

export const no_value_index = -1;

// ---

export class CityDataEvaluator {

    city_zone : CityZone
    city_data : Map<string, CityDatum>
    datum_name : string | null
    num_continuous_colors : number
    range_min : number | null
    range_max : number | null
    data_select : string | null

    constructor (
        city_zone : CityZone,
        city_data : Map<string, CityDatum>,
        range_min : number | null = null,
        range_max : number | null = null,
        data_select : string | null = null
    ) {
        this.city_zone = city_zone;
        this.city_data = city_data;
        this.datum_name = null;
        this.num_continuous_colors = 256
        this.range_min = range_min;
        this.range_max = range_max;
        this.data_select = data_select;
    }

    set_datum_name ( name : string | null ) {
        if ( name !=null && this.city_data.has( name ) ) {
            this.datum_name = name;
        } else {
            this.datum_name = null;
        }
    }

    datum_type () : "attribute" | "time-series" | null {
        if (
            this.datum_name != null &&
            this.city_data.has( this.datum_name )
        ) {
            const city_datum = this.city_data.get(this.datum_name);
            if ( city_datum ) {
                return city_datum.type;
            }
        }
        return null;
    }

    continuous_data() : boolean {
        if ( 
            this.datum_name != null &&
            this.city_data.has( this.datum_name )
        ) {
            const city_datum = this.city_data.get(this.datum_name);
            if ( city_datum && city_datum.is_continuous()  ) {
                return true;
            }
        }
        return false;
    }

    create_colors(
        no_value_color : number,
        color_map : string = "jet"
    ) : DataColor {
        if ( 
            this.datum_name != null &&
            this.city_data.has( this.datum_name )
        ) {
            const city_datum : CityDatum | undefined = this.city_data.get(this.datum_name);
            if ( city_datum ) {
                if ( city_datum.is_continuous() ) {
                    const colors : DataColor = {};
                    const num_colors = this.num_continuous_colors;
                    colors[ no_value_index ] = no_value_color;
                    for ( var i = 0; i < num_colors ; i++ ) {
                        const scaled_value = i / num_colors;
                        const color = color_map_value( scaled_value, color_map );
                        colors[ i ] = Math.floor( color );
                    }
                    return colors;
                } else {
                    const num_unique_values = city_datum.num_unique_values()
                    if ( num_unique_values ) {
                        const colors : DataColor = {};
                        colors[ no_value_index ] = no_value_color;
                        for ( var i = 0; i < num_unique_values; i++ ) {
                            const scaled_value = i / num_unique_values;
                            const color = color_map_value( scaled_value, color_map );
                            colors[ i ] = Math.floor( color );
                        }
                        return colors;
                    }
                }
            }
        }
        return {};
    }

    get_attribute_color_index ( attribute_value : string | number | null ) : number {
        if ( this.datum_name ) {
            const datum : CityDatum | undefined = this.city_data.get( this.datum_name );
            if ( datum && attribute_value != null ) {
                if ( 
                    this.continuous_data() &&
                    datum.value_type == "number" &&
                    typeof attribute_value === "number"
                ) {
                    const value_min :number | null = 
                        this.range_min != null ? this.range_min : datum.value_min;
                    const value_max :number | null = 
                        this.range_max != null ? this.range_max : datum.value_max;
                    if ( value_min != null && value_max != null ) {
                        const shifted_value = ( attribute_value - value_min );
                        const scaled_value = shifted_value / ( value_max - value_min );
                        if ( isNaN( scaled_value ) ) {
                            return 0;
                        }
                        const color_index = Math.floor(scaled_value * this.num_continuous_colors) + 1;
                        if ( color_index > 0 && color_index <= this.num_continuous_colors ) {
                            return color_index;
                        }
                    }
                } else {
                    if ( 
                        datum.value_type == "number" &&
                        typeof attribute_value === "number" &&
                        datum.values_number
                    ) {
                        const color_index = datum.values_number.indexOf( attribute_value );
                        if ( color_index >= 0) {
                            return color_index;
                        }
                    } else if (
                        datum.value_type == "string" &&
                        datum.values_string
                    ) {
                        const value_string : string = String(attribute_value);
                        const color_index = datum.values_string.indexOf( value_string );
                        if ( color_index >= 0) {
                            return color_index;
                        }
                    }
                }
            }
        }
        return no_value_index;
    }

    get_time_series_color_index ( time_serie_info : TimeSeriesInfo | null | undefined ) : number {
        if ( this.datum_name ) {
            const datum = this.city_data.get( this.datum_name );
            if ( datum && time_serie_info ) {
                var value : number
                if ( this.data_select == "minimum" ) {
                    value = time_serie_info.value_min;
                } else if ( this.data_select == "maximum" ) {
                    value = time_serie_info.value_max;
                } else if ( this.data_select == "sum" ) {
                    value = time_serie_info.value_sum;
                } else {
                    value = time_serie_info.value_avg;
                }
                const value_min :number | null = 
                    this.range_min != null ? this.range_min : datum.value_min;
                const value_max :number | null = 
                    this.range_max != null ? this.range_max : datum.value_max;
                if ( value_min != null && value_max != null ) {
                    const shifted_value = ( value - value_min );
                    const scaled_value = shifted_value / ( value_max - value_min );
                    if ( isNaN( scaled_value ) ) {
                        return 0;
                    }
                    const color_index = Math.floor(scaled_value * this.num_continuous_colors) + 1;
                    if ( color_index > 0 && color_index <= this.num_continuous_colors ) {
                        return color_index;
                        
                    }
                }
            }
        }
        return no_value_index;
    }

    get_data_options () : Array<string> | null {
        if ( this.datum_type() == "time-series" ) {
            return ["average", "maximum", "minimum", "sum"];
        }
        return null;
    }

    get_city_object_index (
        city_object_id : string 
    ) : number {
        const city_objects : {[key: string]: CityObject} = 
            this.city_zone.get_city_objects();
        if ( city_objects.hasOwnProperty( city_object_id ) ) {
            const objects_ids = Object.keys( city_objects );
            if ( objects_ids ) {
                return objects_ids.indexOf( city_object_id );
            }
        }
        return - 1;
    }

    get_unique_objects_indices  (
        object_indices : BufferAttribute 
    ) : Set<number> {
        return new Set(object_indices.array)
    }

    get_city_object_id (
        city_object_index : number 
    ) : string | null {
        const city_objects : {[key: string]: CityObject} = 
            this.city_zone.get_city_objects();
        const objects_ids = Object.keys( city_objects );
        if ( city_object_index < objects_ids.length ) {
            return objects_ids[city_object_index];
        }
        return null;
    }

    get_data_buffer_attribute(
        object_indices : BufferAttribute
    ) : Int32BufferAttribute | null {
        const city_objects : {[key: string]: CityObject} = 
            this.city_zone.get_city_objects();
        const unique_objects_indices = this.get_unique_objects_indices(object_indices);
        const object_index_to_color_index : {[key: number]: number} = {}
        unique_objects_indices.forEach((index : number) => {
            const city_object_id : string | null = this.get_city_object_id( index );
            if ( city_object_id != null ) {
                const city_object : CityObject | undefined = city_objects[city_object_id];
                if ( city_object ) {
                    const datum_type = this.datum_type();
                    if ( 
                        this.datum_name != null &&
                        city_object.attributes &&
                        datum_type == "attribute"
                    ) {
                        const attribute_value = city_object.attributes[ this.datum_name ];
                        const color_index = this.get_attribute_color_index( attribute_value );
                        object_index_to_color_index[index] = color_index;
                    } else if (
                        this.datum_name != null &&
                        datum_type == "time-series" 
                    ) {
                        const object_time_series_infos : Map<string, TimeSeriesInfo> = 
                            this.city_zone.get_object_time_series_infos( city_object_id )
                        const time_serie_info : TimeSeriesInfo | undefined = 
                            object_time_series_infos.get( this.datum_name );
                        const color_index = this.get_time_series_color_index( time_serie_info );
                        object_index_to_color_index[index] = color_index;
                    }
                }
            }
        })
        unique_objects_indices.forEach((index) => {
            if ( ! object_index_to_color_index.hasOwnProperty( index ) ) {
                object_index_to_color_index[index] = no_value_index;
            }
        })
        const data_buffer_array = object_indices.array.map(
            (index : number) => object_index_to_color_index[index]
        )
        const data_buffer_attribute = new Int32BufferAttribute( data_buffer_array, 1 );
        return data_buffer_attribute;
    }
}

// ---
