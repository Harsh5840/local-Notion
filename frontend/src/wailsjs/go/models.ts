export namespace main {
	
	export class Note {
	    id: string;
	    title: string;
	    content: string;
	    icon: string;
	    background_image: string;
	    is_favorite: boolean;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Note(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.content = source["content"];
	        this.icon = source["icon"];
	        this.background_image = source["background_image"];
	        this.is_favorite = source["is_favorite"];
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class NoteMeta {
	    id: string;
	    title: string;
	    icon: string;
	    is_favorite: boolean;
	
	    static createFrom(source: any = {}) {
	        return new NoteMeta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.icon = source["icon"];
	        this.is_favorite = source["is_favorite"];
	    }
	}

}

