//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

export class CityDatum {

    public type : "attribute" | "time-series"
    public value_type : "number" | "string"
    public unit : string | null
    public values_number : Array<number> | null
    public values_string : Array<string> | null
    public value_min : number | null
    public value_max : number | null
    public simulation_data : boolean 

    constructor (
        type : "attribute" | "time-series",
        value_type : "number" | "string",
        unit : string | null = null,
        simulation_data : boolean = false
    ) {
        this.type = type;
        this.value_type = value_type;
        this.unit = unit;
        this.values_number = null;
        this.values_string = null;
        this.value_min = null;
        this.value_max = null;
        this.simulation_data = simulation_data;
    }

    is_continuous () : boolean {
        if ( this.value_type == "string" ) {
            return false;
        }
        if ( this.unit != null ) {
            return true;
        }
        if ( this.value_min != null && this.value_max != null ) {
            return true;
        }
        return false;
    }

    to_continuous () : void {
        if ( this.value_type != "number" ) {
            throw new Error("Datum is not a number");
        }
        if ( this.values_number == null ) {
            throw new Error("Empty values");
        }
        this.value_min = Math.min( ...this.values_number)
        this.value_max = Math.max( ...this.values_number)
        delete this.values_number;
        this.values_number = null;
    }

    num_unique_values () : number | null {
        if ( this.value_type == "number" && this.values_number != null ) {
            return this.values_number.length;
        }
        if ( this.value_type == "string" && this.values_string != null ) {
            return this.values_string.length;
        }
        return null;
    }

}

// ---
