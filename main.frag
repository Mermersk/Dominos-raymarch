#version 300 es
precision mediump float;

layout(location = 0) out vec4 outColor;

uniform vec2 u_resolution;
uniform float u_time;

#define PI 3.141592653589793

#define MAX_STEPS 100
#define MAX_DIST 100.0
#define SURFACE_DIST 0.001

#define dBlue vec4(0.0, 100.0/255.0, 144.0/255.0, 1.0)
#define dRed vec4(228.0/255.0, 22.0/255.0, 54.0/255.0, 1.0)



float sdPlane( vec3 p, vec3 n, float h )
{
  // n must be normalized
  return dot(p,n) + h;
}

vec3 rotZ(vec3 p, float angle) {
	
	mat3 m = mat3(cos(angle), -sin(angle), 0.0,
				  sin(angle), cos(angle), 0.0,
				  0.0, 0.0, 1.0);
				  
	return m * p;
}

vec3 rotY(vec3 p, float angle) {
	
	mat3 m = mat3(cos(angle), 0.0, sin(angle),
				  0.0, 1.0, 0.0,
				  -sin(angle), 0.0, cos(angle));
				  
	return m * p;
}

vec3 rotX(vec3 p, float angle) {
	
	mat3 m = mat3(1.0, 0.0, 0.0,
				  0.0, cos(angle), -sin(angle),
				  0.0, sin(angle), cos(angle));
				  
	return m * p;
}

//A struct that hold both the sdf value and the color
struct Surface {
	float distVal;
	vec4 color;
};

Surface plane2D(vec2 p, vec2 pointer, vec4 col) {

	return Surface(dot(p, pointer), col);
}

Surface box(vec3 p, vec3 boxPosition, vec3 boxDimensions, vec4 col) {
	
	//---- Box -------
	
	//Moves the origin to value of boxPosition
	vec3 boxOrigin = p - boxPosition;
	
	if (boxOrigin.x < 0.0) {
		col = dBlue;
	}
	
	//Mirroring
	boxOrigin = abs(boxOrigin);
	//Setting dimensions of each axis
	boxOrigin = boxOrigin - boxDimensions;
	//replacing all negative vectors with the zero vector
	boxOrigin = max(boxOrigin, vec3(0.0));
	
	//vec2(value, ID)
	float distToBox = length(boxOrigin);
	
	return Surface(distToBox, col);
}

Surface sphere(vec3 p, vec3 spherePos, float sphereRadius, vec4 col) {
	
	//----Sphere ------
	
	float distToSphere = length(p - spherePos) - sphereRadius;
	
	return Surface(distToSphere, col);

}


float opExtrusion( in vec3 p, in float primitive, in float h )
{
    float d = primitive;
    vec2 w = vec2( d, abs(p.z) - h );
    return min(max(w.x,w.y),0.0) + length(max(w,0.0));
}

float sdCappedCylinder( vec3 p, float h, float r )
{
  vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(h,r);
  return length(max(d,0.0));
  /*
  float xzLength = length(p.xz);
  xzLength = abs(xzLength);
  p.y = abs(p.y);
  
  xzLength -= h;
  p.y -= r;
  
  vec2 d = vec2(xzLength, p.y);
  d = max(d, vec2(0.0));
  return length(d);
  */
  
}

Surface disk(vec3 p, vec3 position, float radius, float zExtrusion, vec4 col) {
	
	vec3 diskOrigin = p - position;
	
	diskOrigin = rotX(diskOrigin, PI/2.0);
	
	//diskOrigin = rotY(diskOrigin, uTime*0.8);
	
	//diskOrigin.z *= 0.59;
	
	//float distToDisk = length(diskOrigin.xy) - radius;
	
	//float dd = opExtrusion(p, distToDisk, 0.5);
	
	float ddd = sdCappedCylinder(diskOrigin, radius, zExtrusion);
	
	return Surface(ddd, col); 

}


//Surface min function
Surface minWithColor(Surface obj1, Surface obj2) {
	if (obj1.distVal > obj2.distVal) return obj2;
	return obj1;

}

//Subtract one shape from another
Surface subtractAFromB(Surface a, Surface b) {
	
	float dist = max(-a.distVal, b.distVal);
	return Surface(dist, b.color);
	
	//if (-obj1.distVal > obj2.distVal) return obj1;
	//return obj2;
}

Surface dominosLogo(vec3 cs) {
	
	//cs = rotY(cs, uTime);
	cs = rotX(cs, u_time);
	cs = rotZ(cs, PI/4.0 + u_time);
	
	Surface overAllBox = box(cs, vec3(0.0, 0.0, sin(u_time*0.5)*3.0 + 1.0), vec3(2.0, 1.0, 0.1), dRed);
	//Rounding, for why, see: https://www.youtube.com/watch?v=s5NGeUV2EyU&ab_channel=InigoQuilez
	overAllBox.distVal -= 0.2;
	
	Surface disk1 = disk(cs, vec3(1.0, 0.0, sin(u_time*0.5)*3.0 + 1.0), 0.42, 0.3, vec4(1.0));
	Surface disk2 = disk(cs, vec3(-0.6, -0.5, sin(u_time*0.5)*3.0 + 1.0), 0.42, 0.3, vec4(1.0));
	Surface disk3 = disk(cs, vec3(-1.5, 0.5, sin(u_time*0.5)*3.0 + 1.0), 0.42, 0.3, vec4(1.0));
	
	//Combine box and the 3 disks
	Surface diskAndBox = minWithColor(overAllBox, disk1);
	diskAndBox = minWithColor(diskAndBox, disk2);
	diskAndBox = minWithColor(diskAndBox, disk3);
	
	Surface aMinB = subtractAFromB(disk1, overAllBox);
	
	  
	return diskAndBox;

}

Surface getDist(vec3 cs) {
	
	
	Surface box1 = box(cs, vec3(0.0, 0.5, 0.0), vec3(1.0), vec4(0.3, 0.5, 0.7, 1.0));
	Surface s = sphere(cs, vec3(0.0, 0.0, 0.0), 1.0, vec4(1.0, 0.0, 0.0, 1.0));
	
	Surface box2 = box(cs, vec3(cos(u_time)*3.0, sin(u_time), 0.0), vec3(1.0), vec4(0.2, 0.7, 0.3, 1.0));
	
	//float plane = sdPlane(cs.xyz, normalize(vec3(1.0, 1.0, 0.0)), 0.0);
	Surface plane2d = plane2D(cs.xy, normalize(vec2(1.0, 1.0)), vec4(0.5, 0.1, 0.9, 1.0));
	float s2 = length(cs.xyz - vec3(0.25, 0.0, 0.0)) - 0.75;
	
	//float intersection = max(plane2d.distVal, distToBox.x);
	//float aMinusB = max(-plane2d.distVal, distToBox.x);
	
	//float both = min(distToSphere.x, distToBox.x);
	
	Surface sMin = minWithColor(box1, s);
	Surface threeObjects = minWithColor(sMin, box2);
	
	return dominosLogo(cs);
}

Surface rayMarch(vec3 rayOrigin, vec3 rayDirection) {
	//Distance from rayOrigin. As we march forwards we keep track of how far away we have come during the sphere tracing/raymarching.
	float distFromRO = 0.0;
	Surface closestObject = Surface(0.0, vec4(1.0, 0.0, 0.0, 1.0));
	//Surface curStop;
	
	for(int i = 0; i < MAX_STEPS; i++) {
		//The current stop (blue point from video). Will in first iteration just be the rayOrigin
		vec3 currentStop = rayOrigin + (closestObject.distVal * rayDirection);
		//Distance to the closes "thing" in our scene
		Surface distToScene = getDist(currentStop);
		closestObject.distVal += distToScene.distVal;
		closestObject.color = distToScene.color;
		//Surface curStop = getDist(currentStop);
		//Accumulate the distance value
		//distFromRO += distToScene.distVal;
		//distFromRO += distToScene;
		//closestObject = distToScene;
		
		// we have a hit || The distance is too large, this ray hit nothing. we marched past everything, dont want to march to infinity 
		if (closestObject.distVal > MAX_DIST || distToScene.distVal < SURFACE_DIST) {
			break;
		}
		
	}
	
	return closestObject;

}

vec3 getNormals(vec3 p) {
	
	//Gets distance to all objects in the scene
	float d = getDist(p).distVal;
	
	//I want to sample 4 points around each single point
	vec2 pOffset = vec2(0.01, 0.0);
	
	//In the end calculates rate of change(derivative) and gives us a vec3 representation of that,
	//It happesn to be that this is the normal of the surface
	vec3 normals = d - vec3(getDist(p - pOffset.xyy).distVal, 
						getDist(p - pOffset.yxy).distVal, 
						getDist(p - pOffset.yyx).distVal);
	
	return normalize(normals);
}


float getLight(vec3 p) {
	
	vec3 lightPosition = vec3(0.0, 1.0, -2.0);
	//lightPosition.xz += vec2(cos(uTime)*5.0, sin(uTime)*5.0);
	//Makes p the origin for all lightVectors
	vec3 lightVector = normalize(lightPosition - p);
	
	vec3 normals = getNormals(p);
	
	float diff = dot(normals, lightVector);
	diff = clamp(diff, 0.0, 1.0);
	
	return diff;
}

void main() {
	vec2 uv = gl_FragCoord.xy/u_resolution;
    uv = (uv * 2.0) - 1.0;
    float ar = u_resolution.x / u_resolution.y;
    uv.x = uv.x * ar;
    
    vec3 col = vec3(0.0);
    
    //Init raymarch
    vec3 rayOrigin = vec3(0.0, 0.0, -5.0);
    vec3 rayDirection = normalize(vec3(uv.x, uv.y, 1.0));
    
    Surface objects = rayMarch(rayOrigin, rayDirection);
    float d = objects.distVal;
    vec3 surfacePoints = rayOrigin + (rayDirection * d);
    
    //float diffuseLighting = getLight(surfacePoints);
  
  	float diffuseLighting = getLight(surfacePoints);  
    
    if (d < MAX_DIST) {
    	//d = d/3.0;
    	//col += objects.color.rgb;
    	//col += d/50.0;
    	col += mix(vec3(diffuseLighting), objects.color.rgb, 0.5);
    	//col += diffuseLighting + objects.color.rgb;
    }
    
    //col += getNormals(surfacePoints);
    
    //if (d > MAX_DIST) {
    	//Apply background color
    	//col = vec3(0.5, 0.1, 0.2);
    //}
    
    outColor = vec4(col, 1.0);
}