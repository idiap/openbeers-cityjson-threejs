//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

import { DefaultApi, CityModel, DefaultApiInterface, CityObject, SimulationInfo, TimeSeriesInfo } from "openbeers"
import { CityDatum } from "./CityDatum"
import { CityDataParser } from "./CityDataParser"

export class CityZone {

    zone_id : number
    zone_type : number
    city_model : CityModel | null
    city_data: Map<string, CityDatum>
    api : DefaultApiInterface
    city_data_parser : CityDataParser
    freeze_model : Boolean
    chunk_size : Number

    constructor (
        zone_id : number,
        zone_type : number,
        api : DefaultApi,
        freeze_model : Boolean,
        chunk_size : number = 20
    ) {
        this.zone_id = zone_id;
        this.zone_type = zone_type;
        this.api = api;
        this.city_data_parser = new CityDataParser( api );
        this.city_model = null;
        this.city_data = new Map();
        this.freeze_model = freeze_model;
        this.chunk_size = chunk_size;
    }

    async load () {
        try {
            this.city_model = await 
                this.api.cityjsonZoneApiCityjsonZoneZoneIdGet(this.zone_id);
        } catch ( error) {
            throw("error loading city model: " + error);
        }
        if ( this.city_model != null && this.city_model.type != "CityJSON" ) {
            throw("unsupported data format");
        }
    }

    has_model () : boolean {
        return this.city_model ? true : false;
    }

    parse_model_data () : void {
        if ( this.city_model ) {
            this.city_data_parser.parse_city_model( this.city_model );
            this.city_data = this.city_data_parser.get_city_data();
        }
    }

    get_city_object ( city_object_id : string ) : CityObject | null {
        if ( 
            this.city_model &&
            this.city_model.city_objects &&
            city_object_id in this.city_model.city_objects
        ) {
            return this.city_model.city_objects[city_object_id];
        }
        return null;
    }

    get_city_objects () : {[key: string]: CityObject} {
        if ( this.city_model && this.city_model.city_objects) {
            return this.city_model.city_objects;
        }
        return {};
    }

    get_city_objects_ids () : Array<string> {
        if ( this.city_model && this.city_model.city_objects) {
            return Object.keys( this.city_model.city_objects );
        }
        return [];
    }

    get_unit_of_measurement ( attribute_name : string ) : string {
        if ( 
            this.city_model &&
            this.city_model.unit_of_measurement &&
            attribute_name in this.city_model.unit_of_measurement
        ) {
            this.city_model.unit_of_measurement[attribute_name];
        }
        return "";
    }

    get_city_data () : Map<string, CityDatum> {
        return this.city_data;
    }

    get_zone_simulations () : Array<SimulationInfo> {
        return this.city_data_parser.get_zone_simulations_infos();
    }

    async load_zone_simulation_data (
            simulation_id : number,
            progress_update_callback : ( progress : number, total : number ) => void
        ) {
        if ( this.city_model != null ) {
            await this.city_data_parser.load_zone_simulation_data(
                this.city_model,
                simulation_id,
                progress_update_callback
            )
            this.city_data = this.city_data_parser.get_city_data();
        }
    }

    get_object_time_series_infos ( city_object_id : string ) : Map<string, TimeSeriesInfo> {
        const city_object : CityObject | null = this.get_city_object( city_object_id );
        if ( city_object == null ) {
            return new Map();
        }
        const static_time_series_infos = city_object.time_series ? city_object.time_series : {};
        const object_time_series_infos = new Map(Object.entries( static_time_series_infos ));
        const object_id : number | null | undefined = city_object.object_id;
        if ( object_id != null ) {
            const zone_simulation_timeseries = this.city_data_parser.get_zone_simulation_timeseries();
            if ( zone_simulation_timeseries.has(object_id) ) {
                const object_simulation_timeseries : Map<string, TimeSeriesInfo> | undefined = 
                    zone_simulation_timeseries.get( object_id );
                if ( object_simulation_timeseries ) {
                    for ( const time_series_name of object_simulation_timeseries.keys()) {
                        const time_series_info : TimeSeriesInfo | undefined = 
                            object_simulation_timeseries.get(time_series_name);
                        if ( time_series_info ) {
                            object_time_series_infos.set(
                                time_series_name,
                                time_series_info
                            )
                        }
                    }
                }
            }
        }
        return object_time_series_infos;
    }
}

// ---
