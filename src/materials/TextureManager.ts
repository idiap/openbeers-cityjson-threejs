//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
// SPDX-FileContributor: Stelios Vitalis (from cityjson-threejs-loader)
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

import { CityObjectsMeshMaterial } from "../materials/CityObjectsMeshMaterial";
import { CityModel, CityFeature, TextureObject } from "openbeers";
import { 
	ShaderLib, 
	TextureLoader, 
	SRGBColorSpace, 
	RepeatWrapping,
	Texture
} from 'three'

// ---

export class TextureManager {

	textures_objects : Array<TextureObject>
	textures : Array<Texture>
	materials : Array<CityObjectsMeshMaterial>
	needs_update : boolean
	on_change : () => void

	constructor () {
		this.textures_objects = [];
		this.textures = [];
		this.materials = [];
		this.needs_update = false;
		this.on_change = () => {};
		this.load_from_url();
	}

	add_city_data ( city_data: CityModel | CityFeature ) {
		if ( 
			city_data.appearance && 
			city_data.appearance.textures
		) {
			for ( const city_texture of city_data.appearance.textures ) {
				this.textures_objects.push(city_texture)
			}
		}
	}

	get total_textures () : number {
		return this.textures_objects.length;
	}

	get resolved_textures() {
		return this.textures.filter( t => t ).length;
	}

	get_materials( base_material: CityObjectsMeshMaterial ): Array<CityObjectsMeshMaterial> {
		if ( this.materials.length === 0 || this.needs_update ) {
			const materials = [];
			for ( let i = 0; i < this.textures_objects.length; i ++ ) {
				if ( this.textures[ i ] ) {
					const mat = new CityObjectsMeshMaterial(
						ShaderLib.lambert,
						{
							object_colors: base_material.object_colors,
							surface_colors: base_material.surface_colors,
							layer_colors: base_material.layer_colors,
							transparent: true
						} 
					);
					mat.uniforms.cityTexture.value = this.textures[ i ];
					mat.needs_update = true;
					materials.push( mat );
				} else {
					materials.push( base_material );
				}
			}
			for ( const mat of this.materials ) {
				if ( mat !== base_material ) {
					mat.dispose();
				}
			}
			this.materials = materials;
			this.needs_update = false;
		}
		return [ ...this.materials, base_material ];
	}

	set_texture_from_url(
		index : number,
		url : string 
	) : void {
		const context = this;
		function add_texture ( texture : Texture ) : void {
			texture.colorSpace = SRGBColorSpace;
			texture.wrapS = RepeatWrapping;
			texture.wrapT = RepeatWrapping;
			context.textures[ index ] = texture;
			context.needs_update = true;
			context.on_change();
		}
		new TextureLoader().load( url, add_texture);
	}

	load_from_url() {
		this.textures = [];
		for ( const [ i, texture ] of this.textures_objects.entries() ) {
			if ( texture.image ) {
				this.set_texture_from_url( i, texture.image );
			}
		}
	}

	set_texture_from_file( file: any ): void {
		const context = this;
		for ( const [ i, texture_object ] of this.textures_objects.entries() ) {
			if (
				texture_object.image &&
				texture_object.image.includes( file.name )
			) {
				const reader = new FileReader();
				reader.onload = event => {
					if ( event.target ) {
						const img = new Image();
						img.onload = ( evt : Event )=> {
							if (evt.target) {
								const texture = new Texture( evt.target );
								texture.colorSpace = SRGBColorSpace;
								texture.wrapS = RepeatWrapping;
								texture.wrapT = RepeatWrapping;
								context.needs_update = true;
								context.textures[ i ] = texture;
								context.on_change();
							}
						}
						if ( typeof event.target.result == "string"){
							img.src = event.target.result;
						}
					}
				};
				reader.readAsDataURL( file );
			}
		}
	}
}

// ---
