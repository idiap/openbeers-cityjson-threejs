//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

import { 
    CityModel, 
    TimeSeriesInfo,
    SimulationInfo, 
    DefaultApi, 
    DefaultApiInterface, 
    Attribute,
    AttributeType,
    Unit
} from "openbeers";
import { CityDatum } from "./CityDatum";

export class CityDataParser {

    city_data : Map<string, CityDatum>
    simulations : Array<SimulationInfo>
    zone_simulation_attributes : Map<number,Map<string,Attribute>>
    zone_simulation_timeseries : Map<number,Map<string,TimeSeriesInfo>>
    attributes_units : Map<string, CityDatum>
    attributes_types : Map<number, AttributeType>
    units : Map<number, Unit>
    max_unique_values : number
    api : DefaultApiInterface
    progress_num_elements : number
    progress_total_elements : number
    progress_update_callback : ( progress : number, total : number ) => void

    constructor (
        api : DefaultApi,
    ) {
        this.api = api;
        this.city_data = new Map();
        this.attributes_units = new Map();
        this.attributes_types = new Map();
        this.attributes_types = new Map();
        this.units = new Map();
        this.simulations = [];
        this.zone_simulation_attributes = new Map();
        this.zone_simulation_timeseries = new Map();
        this.max_unique_values = 64;
        this.progress_num_elements = 0;
        this.progress_total_elements = 0;
        this.progress_update_callback = ( progress : number, total : number ) => {}
    }

    add_number_attribute ( 
        attribute_name : string, 
        value : number, 
        attribute_unit : string | null = null ,
        simulation_data : boolean = false
    ) {
        if ( ! this.city_data.has(attribute_name) ) {
            var unit : string | null = null;
            if ( attribute_unit != null ) {
                unit
            } else if ( this.attributes_units.hasOwnProperty(attribute_name) ) {
                unit = this.attributes_units[attribute_name];
            }
            const city_datum = new CityDatum("attribute", "number", unit, simulation_data);
            this.city_data.set(attribute_name, city_datum);
        }
        const attribute = this.city_data.get(attribute_name);
        if ( 
            attribute.type == "attribute" &&
            attribute.value_type == "number" 
        ) {
            if ( attribute.is_continuous() ) {
                if ( attribute.value_min == null ) {
                    attribute.value_min = value;
                } else {
                    const value_min = Math.min( attribute.value_min, value );
                    attribute.value_min = value_min;
                }
                if ( attribute.value_max == null ) {
                    attribute.value_max = value;
                } else {
                    const value_max = Math.max( attribute.value_max, value );
                    attribute.value_max = value_max;
                }
            } else {
                if ( attribute.values_number == null ) {
                    attribute.values_number = [];
                }
                if ( ! attribute.values_number.includes( value ) ) {
                    attribute.values_number.push( value );
                }
            }
            if ( attribute.num_unique_values() > this.max_unique_values ) {
                attribute.to_continuous();
            }
        }
    }

    add_string_attribute (
        attribute_name : string,
        value : string,
        simulation_data : boolean = false
    ) {
        if ( ! this.city_data.has(attribute_name) ) {
            const city_datum = new CityDatum("attribute", "string", null, simulation_data);
            this.city_data.set(attribute_name, city_datum);
        }
        const attribute = this.city_data.get(attribute_name);
        if ( 
            attribute.type == "attribute" &&
            attribute.value_type == "string" 
        ) {
            if ( attribute.values_string == null ) {
                attribute.values_string = [];
            }
            if (
                ! attribute.values_string.includes( value ) &&
                attribute.num_unique_values() < this.max_unique_values
            ) {
                attribute.values_string.push( value );
            }
        }
    }

    async get_attribute_type ( attribute_type_id : number ) : Promise<AttributeType> {
        if ( this.attributes_types.has( attribute_type_id) ) {
            return this.attributes_types.get( attribute_type_id );
        }
        const attribute_type : AttributeType =
        await this.api.attributeTypeApiAttributeTypeAttributeTypeIdGet(
            attribute_type_id
        );
        this.attributes_types.set(
            attribute_type_id,
            attribute_type
        );
        return attribute_type;
    }

    async get_unit ( unit_id : number | null ) : Promise<Unit|null> {
        if ( unit_id == null ) {
            return null;
        }
        if ( this.units.has( unit_id) ) {
            return this.units.get( unit_id );
        }
        const unit : Unit = await this.api.unitApiUnitUnitIdGet(
            unit_id
        );
        this.units.set(
            unit_id,
            unit
        );
        return unit;
    }

    async add_attribute ( 
        attribute : Attribute,
        simulation_data : boolean = false
    ) {
        const attribute_type : AttributeType = await this.get_attribute_type( 
            attribute.attribute_type_id
        );
        const attribute_name : string = attribute_type.name;
        if ( attribute.value_type == 1 ) {
            this.add_string_attribute(
                attribute_name,
                attribute.value_string,
                simulation_data
            );
        } else if ( attribute.value_type == 2 ) {
            this.add_number_attribute(
                attribute_name,
                attribute.value_integer,
                null,
                simulation_data
            );
        } else if ( attribute.value_type == 3 ) {
            const unit : Unit | null = await this.get_unit( attribute_type.unit_id )
            const unit_str : string | null = unit == null ? null : unit.symbol;
            this.add_number_attribute(
                attribute_name,
                attribute.value_float,
                unit_str,
                simulation_data
            );
        }
    }

    add_time_series (
        time_series_name : string,
        time_series_info : TimeSeriesInfo,
        simulation_data : boolean = false
    ) {
        const value_min : number | undefined = time_series_info.value_min;
        const value_max : number | undefined = time_series_info.value_max;
        const unit : string | null | undefined = time_series_info.unit;
        if ( value_min === undefined || value_max === undefined ) {
            return;
        }
        if ( this.city_data.has( time_series_name ) ) {
            const time_series = this.city_data.get( time_series_name )
            time_series.value_min = Math.min(
                time_series.value_min,
                value_min
            );
            time_series.value_max = Math.max(
                time_series.value_max,
                value_max
            );
        } else {
            const city_datum = new CityDatum("time-series", "number", unit, simulation_data);
            city_datum.value_min = value_min;
            city_datum.value_max = value_max;
            this.city_data.set(time_series_name, city_datum);
        }
    }

    parse_city_model ( city_model : CityModel ) {
        if ( this.city_data != null ) {
            delete this.city_data;
        }
        this.city_data = new Map();
        if ( !! city_model.city_objects ) {
            if ( !!city_model.unit_of_measurement ) {
                for ( const attribute_name in city_model.unit_of_measurement ) {
                    const unit = city_model.unit_of_measurement[attribute_name]
                    this.attributes_units[attribute_name] = unit;
                }
            }
            for ( const city_object_id in city_model.city_objects ) {
                const city_object = city_model.city_objects[ city_object_id ];
                if ( !! city_object.attributes ) {
                    const attributes = city_object.attributes;
                    for ( const attribute_name in attributes ) {
                        const attribute_value = attributes[attribute_name];
                        if ( typeof attribute_value === 'number' ) {
                            this.add_number_attribute( attribute_name, attribute_value, null, false);
                        } else if ( attribute_value != null ) {
                            const string_value = String(attribute_value);
                            this.add_string_attribute( attribute_name, string_value, false );
                        }
                    }
                }
                if ( !!city_object.time_series ) {
                    const time_series = city_object.time_series;
                    for ( const time_series_name in time_series ) {
                        const time_series_info = time_series[time_series_name];
                        this.add_time_series( time_series_name, time_series_info, false );
                    }
                }
			}
        }
        if ( !! city_model.simulations ) {
            this.simulations = city_model.simulations;
        }
    }

    get_city_data () : Map<string, CityDatum> {
        return this.city_data;
    }

    get_zone_simulations_infos () : Array<SimulationInfo> {
        return this.simulations;
    }

    async load_object_simulation_data ( 
        city_object_id: string,
        city_model : CityModel,
        simulation_id : number
    ) {
        const city_object = city_model.city_objects[ city_object_id ];
        const object_id : number | null = city_object.object_id;
        if ( object_id != null) {
            const attributes : Array<Attribute> = 
            await this.api.attributesObjectIdSimulationIdApiAttributesObjectObjectIdSimulationSimulationIdGet(
                object_id,
                simulation_id
            )
            const object_attributes : Map<string,Attribute> = new Map();
            for ( const i in attributes) {
                const attribute = attributes[i];
                const attribute_type = await this.get_attribute_type( attribute.attribute_type_id );
                const attribute_name = attribute_type.name;
                this.add_attribute( attribute, true );
                object_attributes.set(attribute_name, attribute);
            }
            this.zone_simulation_attributes.set(object_id, object_attributes);
            const time_series_infos: { [key: string]: TimeSeriesInfo; } =
            await this.api.timeSeriesInfoObjectSimulationApiTimeSeriesInfoObjectObjectIdSimulationSimulationIdGet(
                object_id,
                simulation_id
            )
            const object_time_serie_infos : Map<string,TimeSeriesInfo> = new Map();
            for ( const time_series_name in time_series_infos ) {
                const time_series_info = time_series_infos[time_series_name];
                this.add_time_series( time_series_name, time_series_info, true );
                object_time_serie_infos.set(time_series_name, time_series_info);
            }
            this.zone_simulation_timeseries.set( object_id, object_time_serie_infos );
        }
        this.progress_num_elements = this.progress_num_elements + 1;
        this.progress_update_callback(
            this.progress_num_elements,
            this.progress_total_elements
        )
    }
    
    // TODO: delete existing simulation data ?
    // TODO: batch requests?

    async load_zone_simulation_data ( 
        city_model : CityModel,
        simulation_id : number,
        progress_update_callback : ( progress : number, total : number ) => void
    ) {
        this.zone_simulation_attributes = new Map();
        this.zone_simulation_timeseries = new Map();
        const requests = [];
        this.progress_num_elements = 0;
        this.progress_total_elements = Object.keys(city_model.city_objects).length;
        this.progress_update_callback = progress_update_callback;
        this.progress_update_callback(
            0,
            this.progress_total_elements
        )
        for ( const city_object_id in city_model.city_objects ) {
            requests.push(
                this.load_object_simulation_data( 
                    city_object_id,
                    city_model,
                    simulation_id
                )
            )
        }
        await Promise.all( requests );
    }

    get_zone_simulation_attributes () : Map<number,Map<string,Attribute>> {
        return this.zone_simulation_attributes;
    }

    get_zone_simulation_timeseries () : Map<number,Map<string,TimeSeriesInfo>> {
        return this.zone_simulation_timeseries;
    }
}

// ---
