// Real neural circuits the "Your circuit" picture is built from. Each track
// in course.json can pick one with "circuit": "<key>"; tracks without one get
// the next unused circuit. A track's units sit along the pathway in course
// order, in the direction the signal travels.
//
// Points are in the circuit picture's coordinates (360 × 560): brain at the
// top (front of the head on the left), spinal cord down the middle, DRG on
// the right, vagus and abdominal organs on the left.

export const CIRCUITS = {
  somatosensory: {
    name: 'Ascending somatosensory pathway',
    path: 'Receptor → DRG → dorsal horn → spinal cord → brainstem → thalamus → S1 → insula',
    points: [[334, 392], [298, 396], [262, 402], [234, 404], [226, 380], [224, 330], [221, 290], [216, 250], [207, 200], [203, 146], [196, 100], [184, 52], [168, 96], [152, 146]],
  },
  'inflammatory-reflex': {
    name: 'Vagal inflammatory reflex',
    path: 'Spleen → vagal afferent → nodose ganglion → NTS → hypothalamus → DMV → vagal efferent → spleen',
    points: [[66, 498], [58, 440], [62, 380], [84, 330], [112, 300], [160, 284], [206, 268], [190, 214], [176, 172], [196, 228], [214, 276], [150, 300], [96, 338], [76, 392], [72, 450], [74, 492]],
  },
  'basal-ganglia': {
    name: 'Basal ganglia motor loop',
    path: 'Cortex → striatum → GPe → STN → GPi → thalamus → cortex',
    points: [[112, 44], [104, 80], [120, 112], [140, 136], [168, 156], [160, 136], [184, 124], [198, 98], [176, 58], [146, 30]],
    closed: true,
  },
  'spinal-reflex': {
    name: 'Spinal reflex arc',
    path: 'Skin → DRG → dorsal horn → interneuron → ventral horn → muscle',
    points: [[334, 452], [296, 458], [262, 462], [234, 464], [224, 474], [214, 482], [236, 494], [272, 506], [304, 522]],
  },
  'pancreas-afferent': {
    name: 'Pancreatic spinal afferent',
    path: 'Pancreas → splanchnic afferent → DRG → dorsal horn',
    points: [[142, 506], [176, 486], [204, 458], [236, 430], [258, 412], [232, 404]],
  },
  cerebellar: {
    name: 'Cerebellar circuit',
    path: 'Pontine nuclei → mossy fibers → granule cells → Purkinje cells → deep nuclei → thalamus',
    points: [[224, 236], [252, 224], [284, 230], [306, 212], [278, 206], [244, 190], [214, 160]],
  },
};

export const CIRCUIT_KEYS = Object.keys(CIRCUITS);
