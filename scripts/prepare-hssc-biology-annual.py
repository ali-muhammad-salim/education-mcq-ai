"""Import the four original Class XI Biology annual PDFs from a source folder."""
import argparse
import json
from pathlib import Path
import re
import runpy
import shutil

import pymupdf
from PIL import Image

shared = runpy.run_path(str(Path(__file__).with_name('prepare-hssc-biology-model-papers.py')))
ROOT, PUBLIC = shared['ROOT'], shared['PUBLIC']
lines, line_text, paragraphs = (shared[name] for name in ('lines', 'line_text', 'paragraphs'))
table, choices_table = (shared[name] for name in ('table', 'choices_table'))
FIGURES = {
    1: {
        2: (67, 227, 324, 323), 7: (100, 266, 314, 505), 10: (68, 118, 254, 327),
        11: (73, 477, 350, 617), 15: (76, 406, 430, 584), 21: (69, 113, 567, 235),
        31: (98, 114, 202, 224), 32: (94, 371, 329, 505), 33: (98, 530, 228, 650),
        45: (76, 135, 353, 382), 48: (99, 145, 404, 296),
    },
    2: {1: (34, 142, 211, 265), 8: (33, 144, 515, 314), 9: (36, 526, 228, 630)},
}
TABLES = {
    1: {
        6: (118, 228, ['Primary structure', 'Secondary structure', 'Tertiary structure', 'Quaternary structure'],
            ['✓;✗;✗;✗', '✓;✓;✗;✗', '✓;✗;✗;✓', '✓;✓;✓;✓']),
        11: (653, 789, ['I', 'II', 'III', 'IV'], [
            'enzyme concentration;substrate concentration;competitive inhibitor;non-competitive inhibitor',
            'enzyme concentration;substrate concentration;non-competitive inhibitor;competitive inhibitor',
            'substrate concentration;enzyme concentration;competitive inhibitor;non-competitive inhibitor',
            'substrate concentration;enzyme concentration;non-competitive inhibitor;competitive inhibitor']),
        15: (622, 734, ['Magnification', 'Resolution'], ['higher;higher', 'poor;poor', 'poor;higher', 'higher;poor']),
        17: (279, 392, ['I', 'II', 'III', 'IV', 'V'], [
            'polyp;medusa;egg;planula larva;polyp', 'polyp;planula larva;egg;medusa;polyp',
            'medusa;planula larva;polyp;egg;medusa', 'medusa;polyp;planula larva;egg;medusa']),
        25: (649, 760, ['Asexual spore', 'Sexual spore'],
             ['zoospores;oospores', 'microspores;megaspores', 'zoospores;megaspores', 'microspores;oospores']),
        28: (318, 437, ['Mycelium', 'Zygospore'], ['haploid;haploid', 'diploid;diploid', 'diploid;haploid', 'haploid;diploid']),
        33: (682, 787, ['X', 'Function'], ['rhizoids;aid in water absorption', 'gemma cup;produce eggs and sperms',
                                           'rhizoids;anchor the thallus', 'gemma cup;involve in vegetative reproduction']),
        48: (350, 465, ['X', 'Y', 'Z'], ['Ψw;ΨP;ΨS', 'ΨP;ΨS;Ψw', 'ΨS;Ψw;ΨP', 'ΨP;Ψw;ΨS']),
        49: (512, 639, ['Characteristic', 'T-lymphocyte', 'B-lymphocyte'], [
            'Types of active cells;plasma cells;cytotoxic and helper cells',
            'Secretory product;cytokines;antibodies', 'Site of maturation;bone marrow;thymus gland',
            'Formation of memory cells;memory cells are formed;memory cells are not formed']),
    },
    2: {
        3: (153, 250, table(['Plant cell', 'Animal cell'], [['', '']])),
        4: (359, 473, table(['Characteristic', 'Polyp', 'Medusa'], [['Body shape', '', ''], ['Mode of reproduction', '', '']])),
        6: (143, 280, table(['Feature', 'C₄', 'CAM'], [['Tissues where carbon fixation takes place', '', ''], ['Time of stomatal opening', '', '']])),
    },
}
FIGURES_2024 = {
    1: {
        4: (68, 568, 347, 756), 8: (71, 426, 275, 557), 9: (68, 112, 543, 150),
        10: (70, 546, 540, 608), 11: (89, 115, 370, 218), 16: (69, 306, 343, 421),
        23: (70, 113, 480, 350), 38: (95, 134, 352, 352), 42: (70, 116, 391, 297),
        49: (104, 357, 540, 545),
    },
    2: {1: (56, 139, 387, 270), 2: (59, 205, 420, 442), 6: (63, 141, 393, 312), 7: (60, 468, 262, 634)},
}
FIGURES_2023 = {
    1: {
        3: (71, 327, 343, 447), 9: (68, 127, 443, 294), 10: (68, 470, 455, 721),
        20: (70, 404, 499, 515), 22: (98, 109, 441, 345), 27: (68, 205, 267, 336),
        31: (96, 220, 464, 424), 34: (68, 125, 241, 272), 37: (68, 542, 433, 584),
        38: (96, 116, 527, 215), 43: (68, 125, 414, 401), 47: (92, 445, 360, 578),
        48: (67, 127, 358, 294),
    },
    2: {
        1: (36, 143, 574, 252), 3: (62, 136, 466, 314), 6: (36, 397, 478, 493),
    },
}
TABLES_2023 = {
    1: {
        3: (489, 615, ['Type of secondary structure', 'Type of bond'], ['β-sheet;hydrogen', 'α-helix;hydrogen', 'β-sheet;ionic', 'α-helix;ionic']),
        22: (378, 490, ['X', 'Y', 'Z'], ['pilus;F⁺;F⁺', 'pilus;F⁺;F⁻', 'flagellum;F⁻;F⁻', 'flagellum;F⁺;F⁻']),
        43: (447, 580, ['Countercurrent exchange system', 'Concurrent exchange system'], [
            'is unidirectional.;is bidirectional.', 'maintains 20% pressure gradient.;maintains 30% pressure gradient.',
            'allows more contact time between blood and water.;allows less contact time between blood and water.',
            'retains O₂ concentration gradient between blood and water.;causes O₂ concentration gradient between blood and water to reach equilibrium.']),
        45: (132, 250, ['Muscles of diaphragm', 'Internal intercostal muscles'], ['Contract;Contract', 'Contract;Relax', 'Relax;Relax', 'Relax;Contract']),
        46: (294, 407, ['Ventricles', 'Atrioventricular valves', 'Semilunar valves'],
             ['relaxed;opened;opened', 'relaxed;opened;closed', 'contracted;closed;closed', 'contracted;closed;opened']),
        47: (623, 749, ['Net movement of water', 'Water potential of cell', 'Effect of solution on cell'],
             ['into cell;becomes higher;becomes turgid', 'into cell;becomes lower;bursts', 'out of cell;becomes higher;swells', 'out of cell;becomes lower;becomes plasmolysed']),
    },
    2: {
        3: (355, 498, table(['Label', 'Organelle / structure', 'Any one function'], [
            ['I', 'Nuclear envelope', ''], ['II', '', 'Its function is to produce, fold, modify and transport proteins and lipids.']])),
    },
}
EXAMPLES_2023 = {
    '1': ([(2, 653, 680), (3, 74, 186)], [(3, 286, 488)]),
    '2': ([(5, 395, 513)], [(5, 600, 683)]),
    '3': ([(8, 72, 176)], [(8, 255, 386)]),
    '4': ([(9, 546, 680)], [(10, 128, 244)]),
    '5': ([(11, 402, 528)], [(12, 72, 216)]),
    '6': ([(13, 501, 535)], [(13, 638, 676)]),
    '7': ([(15, 381, 565)], [(15, 649, 702)]),
    '8': ([(17, 367, 500)], [(17, 558, 693)]),
    '9': ([(19, 356, 495)], [(19, 574, 682)]),
    '10a': ([(21, 506, 707)], [(22, 142, 384)]),
    '10b': ([(24, 74, 336)], [(24, 420, 695)]),
    '11a': ([(26, 448, 703)], [(27, 171, 481)]),
    '11b': ([(30, 104, 460)], [(31, 78, 396)]),
}
TABLES_2024 = {
    1: {
        10: (641, 752, ['Enzyme', 'Role of Cl⁻'], ['amylase;cofactor', 'amylase;coenzyme', 'pectinase;cofactor', 'pectinase;coenzyme']),
        11: (249, 383, ['X', 'Y', 'Z'], ['substrate;non-competitive inhibitor;enzyme', 'non-competitive inhibitor;enzyme;substrate',
                                        'substrate;competitive inhibitor;enzyme', 'competitive inhibitor;non-competitive inhibitor;substrate']),
        13: (523, 643, ['Membrane-bounded', 'Contains pigment', 'Found in plants'], ['✓;✓;✗', '✗;✓;✓', '✓;✓;✓', '✓;✗;✓']),
        15: (157, 274, ['Pellet', 'Supernatant'], ['nuclei;dissolved ions', 'dissolved ions;dissolved ions', 'nuclei;nuclei', 'dissolved ions;nuclei']),
        28: (212, 327, ['Fungi', 'Plant'], ['starch;glycogen', 'starch;starch', 'glycogen;glycogen', 'glycogen;starch']),
        47: (121, 236, ['Humidity', 'Temperature', 'Wind speed'], ['high;low;high', 'low;high;high', 'high;low;low', 'low;high;low']),
        49: (585, 700, ['X', 'Y'], ['stroke;haemorrhage', 'haemorrhage;stroke', 'haemorrhage;arteriosclerosis', 'stroke;atherosclerosis']),
    },
    2: {
        4: (143, 255, table(['Class', 'Example'], [['Gastropoda', ''], ['Cephalopoda', '']])),
        10: (216, 257, table(['', '', ''], [['Nucleus', 'Ribosomes', 'Secretory vesicles'], ['Golgi apparatus', 'Nucleolus', 'Endoplasmic reticulum']])),
    },
}
PICTURED_CHOICES = {
    2022: {
        29: ((458, 697), [(89, 461, 299, 546), (312, 463, 524, 543), (79, 583, 291, 665), (308, 582, 508, 665)]),
        46: ((116, 461), [(77, 120, 286, 268), (297, 120, 505, 268), (77, 293, 286, 429), (297, 293, 505, 429)]),
        59: ((559, 705), [(75, 565, 183, 680), (192, 562, 297, 683), (304, 560, 427, 685), (427, 561, 528, 684)]),
    },
    2023: {},
    2024: {
        9: ((190, 512), [(74, 194, 250, 333), (276, 194, 452, 333), (84, 351, 260, 490), (287, 351, 462, 490)]),
        22: ((514, 628), [(125, 532, 202, 585), (228, 512, 324, 600), (332, 518, 441, 598), (442, 515, 560, 600)]),
        30: ((463, 601), [(108, 464, 208, 558), (217, 466, 314, 558), (328, 466, 424, 555), (438, 466, 536, 558)]),
        36: ((441, 621), [(73, 443, 300, 509), (306, 443, 536, 509), (73, 527, 300, 592), (306, 527, 536, 592)]),
    },
    2025: {42: ((345, 520), [(111, 345, 202, 487), (215, 360, 323, 470), (338, 350, 420, 476), (444, 362, 543, 478)])},
}
FIGURES_2017 = {
    1: {2: (66, 253, 451, 460), 3: (70, 634, 481, 696), 5: (97, 253, 314, 415),
        20: (64, 101, 356, 188), 22: (69, 455, 218, 627), 23: (95, 111, 290, 257),
        26: (68, 112, 290, 270), 27: (67, 463, 253, 616), 29: (95, 293, 318, 417)},
    2: {2: (165, 287, 461, 611), 4: (187, 290, 369, 421), 5: (106, 140, 475, 334),
        6: (225, 404, 399, 551), 8: (83, 139, 565, 312), 9: (168, 154, 345, 408),
        10: (255, 166, 352, 318), 11: (228, 324, 390, 458)},
}
TABLES_2017 = {
    1: {
        2: (492, 605, ['I', 'II'], ['Ecosystem;Population', 'Population;Community', 'Community;Population', 'Population;Ecosystem']),
        7: (572, 687, ['Structure', 'Composition', 'Function'],
            ['Branched;Proteins;Maintenance of cell shape', 'Branched;Carbohydrates;Maintenance of cell shape',
             'Unbranched;Proteins;Help in mitosis', 'Unbranched;Carbohydrates;Help in mitosis']),
        10: (226, 350, ['Outer membrane', 'Peptidoglycan layer'],
             ['Absent;Present', 'Present;Absent', 'Absent;Absent', 'Present;Present']),
        19: (639, 772, ['Sporophyte', 'Gametophyte'],
             ['Independent and dominant;Less conspicuous and dependent', 'Less conspicuous and dependent;Independent and dominant',
              'Dependent and dominant;More conspicuous and independent', 'More conspicuous and independent;Dependent and dominant']),
        21: (315, 431, ['Water', 'Temperature', 'CO₂'], ['✗;✓;✓', '✓;✓;✗', '✗;✗;✓', '✓;✗;✗']),
        26: (302, 437, ['Body tissues', 'Lungs'], ['Low;High', 'Low;Low', 'High;High', 'High;Low']),
        29: (453, 592, ['I: K⁺ ions', 'I: Water', 'II: K⁺ ions', 'II: Water'],
             ['High;High;Low;Low', 'Low;Low;High;High', 'Low;High;High;Low', 'High;Low;Low;High']),
    },
    2: {
        6: (168, 390, table(['pH', 'Part of the gastrointestinal tract', 'Role of pH in enzymatic digestion'],
                             [['High (around 8)', '', ''], ['Low (around 2)', '', '']])),
        9: (537, 753, table(['Description of phenomenon', 'Name of phenomenon'], [
            ['Water molecules stick to the walls of xylem so that the column of water in xylem tissue does not break.', ''],
            ['It is the uptake of water by seeds during germination.', ''],
            ['It is provided when the water chain is pulled up in the xylem. It is formed between the molecules of water by hydrogen bonding.', '']])),
    },
}
PICTURED_CHOICES[2017] = {}

FIGURES_2018 = {
    1: {4: (96, 111, 365, 248), 6: (91, 475, 574, 610), 9: (37, 373, 539, 493),
        11: (87, 123, 330, 307), 13: (94, 422, 523, 555), 17: (65, 592, 267, 776),
        19: (94, 290, 227, 427), 25: (70, 522, 512, 658), 28: (96, 308, 411, 489)},
    2: {1: (65, 332, 416, 453), 5: (64, 134, 349, 275), 7: (88, 347, 271, 553), 10: (194, 301, 456, 488)},
}
TABLES_2018 = {1: {
    20: (644, 759, ['Utilisation of ATP', 'Production of NADH'], ['Yes;Yes', 'No;Yes', 'Yes;No', 'No;No']),
    25: (672, 786, ['M', 'N'], ['Alveoli;Atmosphere', 'Alveoli;Body cells', 'Body cells;Atmosphere', 'Body cells;Alveoli']),
}, 2: {}}
PICTURED_CHOICES[2018] = {
    2: ((285, 606), [(41, 291, 260, 426), (278, 291, 505, 426), (56, 446, 267, 576), (296, 446, 505, 576)]),
    10: ((614, 798), [(55, 620, 231, 671), (326, 620, 512, 671), (54, 702, 290, 779), (323, 698, 554, 780)]),
    16: ((243, 546), [(107, 258, 251, 339), (338, 258, 469, 366), (145, 402, 216, 510), (345, 402, 464, 511)]),
    19: ((451, 588), [(91, 455, 233, 561), (239, 455, 384, 551), (387, 455, 472, 560), (495, 455, 559, 566)]),
}

FIGURES_2019 = {
    1: {4: (67, 513, 407, 665), 5: (95, 111, 307, 330), 7: (67, 111, 300, 207),
        11: (94, 111, 407, 267), 17: (65, 243, 422, 451), 18: (94, 112, 429, 274),
        20: (94, 491, 371, 602), 25: (65, 461, 506, 589), 28: (95, 381, 548, 548),
        32: (65, 406, 240, 537), 33: (95, 111, 330, 252)},
    2: {2: (67, 134, 564, 206), 3: (32, 134, 384, 333), 4: (69, 132, 375, 331),
        11: (92, 350, 512, 538)},
}
TABLES_2019 = {
    1: {
        22: (132, 248, ['I', 'II', 'III', 'IV', 'V'], [
            'polyp;medusa;egg;planula larva;polyp', 'polyp;planula larva;egg;medusa;polyp',
            'medusa;planula larva;polyp;egg;medusa', 'medusa;polyp;planula larva;egg;medusa']),
        30: (119, 234, ['Pressure in thoracic cavity', 'Volume of thoracic cavity'],
             ['increases;increases', 'increases;decreases', 'decreases;increases', 'decreases;decreases']),
        33: (292, 433, ['I: K⁺ ions', 'I: Water', 'II: K⁺ ions', 'II: Water'],
             ['High;High;Low;Low', 'Low;Low;High;High', 'Low;High;High;Low', 'High;Low;Low;High']),
    },
    2: {
        6: (250, 460, table(['Floral characteristic', 'Solanaceae', 'Fabaceae'],
                             [[feature, '', ''] for feature in ['Inflorescence', 'Placentation', 'Flower symmetry']])),
        8: (250, 505, table(['S. No.', 'Small intestine', 'Large intestine'], [[i, '', ''] for i in ['i.', 'ii.', 'iii.', 'iv.']])),
        9: (556, 670, table(['Cause (name of bacterium)', 'Symptoms'], [['', 'i.'], ['', 'ii.']])),
    },
}
PICTURED_CHOICES[2019] = {7: ((239, 359), [
    (70, 246, 150, 331), (153, 246, 232, 331), (235, 246, 314, 331), (317, 246, 396, 331),
])}

FIGURES_2021 = {1: {
    1: (82, 153, 455, 343), 4: (91, 109, 558, 438), 7: (67, 113, 199, 253),
    19: (67, 376, 138, 504), 21: (91, 110, 410, 434), 26: (57, 274, 300, 469),
    30: (100, 203, 397, 423), 31: (69, 132, 345, 365), 38: (67, 110, 224, 210),
    41: (73, 592, 277, 805), 42: (95, 112, 335, 264), 43: (96, 466, 329, 565),
    53: (67, 111, 182, 211), 55: (54, 598, 336, 704), 56: (93, 111, 228, 211),
    57: (93, 400, 259, 527), 58: (64, 121, 337, 247), 59: (66, 361, 195, 491),
    60: (93, 110, 198, 219), 61: (90, 438, 308, 589), 62: (75, 118, 464, 391),
    63: (67, 514, 283, 633),
}}
TABLES_2021 = {1: {
    5: (572, 686, ['Class', 'Type of coelom', 'Organisation'],
        ['hirudinea;coelomate;triploblastic', 'polychaeta;coelomate;triploblastic', 'oligochaeta;pseudocoelomate;diploblastic', 'hirudinea;acoelomate;diploblastic']),
    8: (444, 577, ['Ostium', 'Osculum'],
        ['single cavity inside the body;pore by which the water leaves the body',
         'pore through which water enters the body;pore by which the water leaves the body',
         'pore through which water enters the body;gelatinous mesenchyme which may contain cells',
         'single cavity inside the body;gelatinous mesenchyme which may contain cells']),
    12: (242, 354, ['Type of endoskeleton', 'Jaws'], ['cartilaginous;present', 'bony;present', 'cartilaginous;absent', 'bony;absent']),
    20: (619, 734, ['Fungal hypha and zygote', 'Ploidy'],
         ['dikaryotic hypha;polyploid', 'zygote;polyploid', 'dikaryotic hypha;haploid', 'zygote;haploid']),
    25: (134, 247, ['Ploidy of embryo', 'Generation'],
         ['diploid;sporophyte', 'haploid;sporophyte', 'diploid;gametophyte', 'haploid;gametophyte']),
    33: (592, 705, ['Parietal cell', 'Zymogen cell'],
         ['gastrin;hydrochloric acid', 'hydrochloric acid;gastrin', 'hydrochloric acid;pepsinogen', 'gastrin;pepsinogen']),
    42: (302, 436, ['Body tissues', 'Lungs'], ['low;high', 'low;low', 'high;high', 'high;low']),
    47: (399, 512, ['Atrioventricular valve', 'Semilunar valve'], ['open;close', 'close;open', 'close;close', 'open;open']),
    51: (421, 573, ['Test tube I', 'Test tube II'],
         ['amylase hydrolysed the starch to fructose;starch is not hydrolysed by boiled amylase',
          'starch is not hydrolysed by amylase;boiled amylase hydrolysed the starch to maltose',
          'amylase converts the starch to fructose;boiled amylase hydrolysed the starch to maltose',
          'amylase hydrolysed the starch to maltose;starch is not hydrolysed by boiled amylase']),
    53: (245, 359, ['Identification', 'Distinguishing feature'], ['mussel;bivalved shell', 'mussel;soft body', 'slug;bivalved shell', 'slug;soft body']),
    56: (245, 359, ['Identification', 'Reason for identification'], ['euglena;spindle-shape', 'euglena;slipper-shape', 'paramecium;spindle-shape', 'paramecium;slipper-shape']),
    63: (667, 781, ['Blood cell X', 'Reason for identification'],
         ['neutrophils;multilobed nucleus', 'basophils;multilobed nucleus', 'neutrophils;bilobed nucleus', 'basophils;bilobed nucleus']),
}}
PICTURED_CHOICES[2021] = {
    7: ((278, 412), [(64, 281, 203, 386), (211, 280, 356, 377), (358, 280, 444, 387), (464, 280, 531, 391)]),
    23: ((548, 711), [(103, 565, 203, 663), (208, 560, 313, 669), (316, 557, 403, 673), (422, 561, 509, 668)]),
    37: ((329, 696), [(96, 331, 279, 489), (318, 331, 466, 489), (96, 513, 279, 675), (318, 513, 466, 675)]),
    52: ((626, 791), [(112, 637, 204, 756), (228, 641, 318, 752), (339, 631, 437, 762), (450, 630, 555, 763)]),
    60: ((250, 411), [(96, 253, 202, 371), (208, 250, 314, 372), (318, 249, 442, 372), (445, 250, 549, 372)]),
}

FIGURES_2022 = {
    1: {
        2: (69, 263, 369, 439), 3: (72, 567, 484, 596), 8: (98, 467, 401, 609),
        13: (67, 550, 391, 715), 19: (65, 111, 354, 344), 22: (93, 107, 324, 266),
        31: (96, 108, 349, 136), 34: (97, 444, 506, 487), 41: (70, 549, 485, 580),
        47: (67, 526, 478, 697), 52: (61, 476, 315, 582), 53: (87, 105, 211, 212),
        57: (61, 111, 187, 248), 58: (70, 386, 443, 530), 64: (67, 109, 191, 230),
        65: (58, 375, 481, 638),
    },
}
TABLES_2022 = {1: {
    8: (638, 752, ['I', 'II'], ['bilaterally symmetrical;asymmetrical', 'bilaterally symmetrical;bilaterally symmetrical',
                               'radially symmetrical;bilaterally symmetrical', 'asymmetrical;radially symmetrical']),
    19: (375, 489, ['I', 'II', 'III'], ['plasmogamy;karyogamy;meiosis', 'karyogamy;plasmogamy;meiosis',
                                       'plasmogamy;karyogamy;mitosis', 'karyogamy;plasmogamy;mitosis']),
    24: (403, 518, ['Synergid', 'Antipodal cell', 'Central cell'], ['haploid;haploid;haploid', 'haploid;haploid;diploid',
                                                                 'diploid;diploid;diploid', 'diploid;diploid;haploid']),
    26: (660, 775, ['Sporophyte generation', 'Gametophyte generation'], [
        'independent and dominant;less conspicuous and dependent', 'less conspicuous and dependent;independent and dominant',
        'dependent and dominant;more conspicuous and independent', 'more conspicuous and independent;dependent and dominant']),
    38: (222, 340, ['Temperature', 'CO₂ to O₂ ratio'], ['low;low', 'low;high', 'high;low', 'high;high']),
    45: (489, 606, ['X', 'Y', 'Z'], ['carbon dioxide;potassium ions;decreases', 'glucose;potassium ions;decreases',
                                      'carbon dioxide;hydrogen ions;increases', 'glucose;hydrogen ions;increases']),
    50: (423, 566, ['Change in pressure', 'Atrioventricular valve', 'Aortic valve'], [
        'atrial pressure exceeds ventricular pressure;closes;opens', 'ventricular pressure exceeds atrial pressure;closes;opens',
        'atrial pressure exceeds ventricular pressure;opens;closes', 'ventricular pressure exceeds atrial pressure;opens;closes']),
}}
SHARED_TABLES_2022 = {
    54: 'The table shows Gram stain results for four bacterial samples.\n\n' + table(['Sample', 'Bacteria', 'Resulting stain'], [
        ['I', 'Escherichia coli', 'Pinkish red'], ['II', 'Streptococcus pneumoniae', 'Dark purple'],
        ['III', 'Streptococcus pyogenes', 'Bluish purple'], ['IV', 'Salmonella typhi', 'Red to pink']]),
    61: 'The solvent travelled 10 cm in a paper chromatography experiment.\n\n' + table(['Pigment', 'Rf value'], [
        ['Chlorophyll a', '0.65'], ['Chlorophyll b', '0.45'], ['Carotene', '0.95'], ['Xanthophyll', '0.71']]),
}

# The supplied key ends at question 50. These rows come from the board's
# H2201 / 191111A verification report, available as a publicly mirrored copy.
ATP_KEY_2022 = [
    ('C', '3.4.1', 'K'), ('D', '10.13.5', 'U'), ('D', '10.10.1', 'U'),
    ('D', '6.2.4', 'A'), ('A', '6.2.4', 'A'), ('C', '7.3.1', 'U'),
    ('D', '8.2.1', 'U'), ('A', '9.2.2', 'U'), ('B', '9.5.1', 'A'),
    ('C', '9.5.1', 'A'), ('A', '11.2.4', 'A'), ('A', '11.2.4', 'A'),
    ('B', '13.3.1', 'U'), ('B', '14.2.1', 'U'), ('A', '14.7.9', 'A'),
]


def crop(page, box, folder, name):
    relative = f'/paper-crops/{folder}/{name}.png'
    target = ROOT / 'public' / relative.lstrip('/')
    target.parent.mkdir(parents=True, exist_ok=True)
    page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=pymupdf.Rect(box), alpha=False).save(target)
    return relative


def read_paper(doc, part, keys, year):
    folder = f'BIO-XI-{year}-P{part}'
    figures = {2017: FIGURES_2017, 2018: FIGURES_2018, 2019: FIGURES_2019, 2021: FIGURES_2021, 2022: FIGURES_2022, 2023: FIGURES_2023, 2024: FIGURES_2024, 2025: FIGURES}[year]
    tables = {2017: TABLES_2017, 2018: TABLES_2018, 2019: TABLES_2019, 2021: TABLES_2021, 2022: TABLES_2022, 2023: TABLES_2023, 2024: TABLES_2024, 2025: TABLES}[year]
    label_questions = {2017: {5}, 2018: {11, 17, 28}, 2019: set(), 2021: {21, 41}, 2022: {13, 22, 47, 58}, 2023: {10, 34}, 2024: {4, 38}, 2025: {7, 32}}[year]
    number = re.compile(r'^(?:Q\.)?(\d{1,2})\.?(?:\s|$)' if part == 2 else r'^(\d{1,2})\.(?:\s|$)')
    result = []
    printed_numbers = []
    for page in list(doc)[1:]:
        rows = lines(page)
        starts = [(y, int(match[1])) for y, x, text in rows if x < 80 and (match := number.match(text))]
        for index, (top, qnum) in enumerate(starts):
            printed_numbers.append(qnum)
            bottom = starts[index + 1][0] - 12 if index + 1 < len(starts) else 799
            if year == 2022 and qnum in {53, 60}:
                bottom = next(y for y, _, text in rows if y > top and text.startswith('Use the given information'))
            if year == 2021:
                bottom = {41: 805, 50: 221, 65: 515}.get(qnum, bottom)
            selected = [(y, x, text) for y, x, text in rows if top - 1 <= y < bottom and text and not re.fullmatch(r'[_\s]+', text)]
            replacements = []
            choices = {}
            if year == 2019 and part == 1 and qnum == 28:
                # The PDF's embedded image covers labels III and IV. Restore
                # the printed text at its original positions in the digital crop.
                page.insert_text((390.4, 493.4), 'III', fontsize=12, fontname='tiro')
                page.insert_text((213.2, 502.6), 'IV', fontsize=12, fontname='tiro')
            if box := figures[part].get(qnum):
                image = crop(page, box, folder, f'question-{qnum}')
                replacements.append((box[1], box[3], f'![Diagram for question {qnum}]({image})'))
            if tab := tables[part].get(qnum):
                start, end, *content = tab
                if part == 1:
                    headers, values = content
                    choices = dict(zip('ABCD', [' · '.join(f'{header}: {value}' for header, value in zip(headers, row.split(';'), strict=True)) for row in values], strict=True))
                    formatted = choices_table(headers, values)
                else:
                    formatted = content[0]
                replacements.append((start, end, formatted))
            if part == 1 and year == 2024 and qnum == 21:
                taxonomy = table(['Human', 'Chimpanzee'], [[taxon, taxon] for taxon in
                    ['Animalia', 'Vertebrata', 'Mammalia', 'Primate', 'Hominidae']] + [['Homo', 'Pan'], ['sapiens', 'troglodites']])
                replacements.append((211, 378, taxonomy))
            if year == 2019:
                if part == 1 and qnum == 6:
                    replacements.append((445, 569, table(['S. No.', 'Temperature (°C)', 'Product formation (%)'],
                                        [['I', '20', '40'], ['II', '25', '60'], ['III', '30', '80'], ['IV', '35', '100']])))
                if part == 1 and qnum == 31:
                    replacements.append((263, 287, 'CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻'))
                if part == 2 and qnum == 1:
                    for serial, box in enumerate([(60, 144, 444, 217), (58, 493, 334, 532)], 1):
                        image = crop(page, box, folder, f'question-1-{serial}')
                        replacements.append((box[1], box[3], f'![Diagram for question 1, part {"ab"[serial - 1]}]({image})'))
            if year == 2018:
                if part == 1 and qnum == 9:
                    choices = dict(zip('ABCD', ['II → III → IV → V → I', 'II → V → III → IV → I',
                                                'III → II → IV → V → I', 'III → II → V → IV → I'], strict=True))
                    replacements.append((524, 594, ''))
                if part == 2 and qnum == 7:
                    replacements.append((148, 177, '2H₂O → 4H⁺ + 4e⁻ + O₂'))
            if year == 2017:
                if part == 1 and qnum == 24:
                    replacements.append((413, 438, 'CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻'))
                if part == 2 and qnum == 1:
                    for serial, box in enumerate([(65, 137, 498, 417), (29, 613, 519, 735)], 1):
                        image = crop(page, box, folder, f'question-1-{serial}')
                        replacements.append((box[1], box[3], f'![Diagram for question 1, part {"ab"[serial - 1]}]({image})'))
            if year == 2023:
                if part == 1 and qnum == 8:
                    temperatures = table(['S. No.', 'Temperature (°C)', 'Product formation (%)'],
                                         [['I', '20', '40'], ['II', '25', '60'], ['III', '30', '80'], ['IV', '35', '100']])
                    replacements.append((448, 572, temperatures))
                if part == 2 and qnum == 11:
                    for serial, box in enumerate([(118, 177, 405, 216), (60, 388, 578, 668)], 1):
                        image = crop(page, box, folder, f'question-11-{serial}')
                        replacements.append((box[1], box[3], f'![Diagram for question 11, part {serial}]({image})'))
            if year == 2022 and qnum == 51:
                results = table(['Sample', 'Resulting colour', 'Amount of remaining starch'], [
                    ['I', 'Dark blue-black', 'All'], ['II', 'Blue', 'Most'], ['III', 'Golden brown', 'None'], ['IV', 'Light brown', 'Some']])
                replacements.append((221, 347, results))
            if part == 1 and qnum in label_questions:
                choices = {letter: f'{"Point" if year == 2023 and qnum == 10 else "Label"} {letter}' for letter in 'ABCD'}
            if year == 2021 and qnum == 59:
                choices = dict(zip('ABCD', [
                    '⊕, ⚥, K₅, C₁₊₂₊₂, A₉₊₁, G̲₁',
                    '+, ♀, K₍₅₎, C₁₊₂₊₍₂₎, A₍₉₎₊₁, G̲₁',
                    '+, ⚥, K₍₅₎, C₁₊₂₊₍₂₎, A₍₉₎₊₁, G̲₁',
                    '⊕, ♀, K₍₅₎, C₁₊₂₊₍₂₎, A₍₉₎₊₁, G̲₁',
                ], strict=True))
                replacements.append((518, 599, ''))
            if part == 1 and (pictured := PICTURED_CHOICES[year].get(qnum)):
                (start, end), placements = pictured
                for letter, box in zip('ABCD', placements, strict=True):
                    url = crop(page, box, folder, f'question-{qnum}-option-{letter.lower()}')
                    label = 'Plant shown in' if year == 2025 else 'Diagram for'
                    choices[letter] = f'![{label} choice {letter}]({url})'
                replacements.append((start, end, ''))
            selected = [(y, x, text) for y, x, text in selected if not any(start < y < end for start, end, _ in replacements)]
            selected += [(start + 1, 33, value) for start, _, value in replacements if value]
            body = line_text(sorted(selected))
            heading = number.sub('', body[0]).strip()
            body = ([heading] if heading else []) + body[1:]
            if year == 2018 and part == 2 and qnum == 9:
                continuation = doc[page.number + 1]
                image = crop(continuation, (67, 133, 365, 361), folder, 'question-9b')
                body += line_text([row for row in lines(continuation) if 100 < row[0] < 125 and row[2]])
                body.append(f'![Antibody response graph for question 9b]({image})')
                body += line_text([row for row in lines(continuation) if 375 < row[0] < 660 and row[2] and not re.fullmatch(r'[_\s]+', row[2])])
            body = [text.replace('\uf0b7', '•') for text in body]
            item = {'number': str(qnum), 'page': page.number + 1, 'marks': 1}
            if part == 1:
                if not choices:
                    options = [(i, m[1], m[2]) for i, text in enumerate(body) if (m := re.fullmatch(r'([A-D])\.\s*(.*)', text))]
                    assert [key for _, key, _ in options] == list('ABCD'), (qnum, body)
                    for i, (start, key, value) in enumerate(options):
                        end = options[i + 1][0] if i + 1 < len(options) else len(body)
                        choices[key] = ' '.join([value, *body[start + 1:end]]).strip()
                    body = body[:options[0][0]]
                if year == 2017 and qnum == 9:
                    choices['A'] = '<u>Chaetodon</u> <u>ocellata</u>.'
                    choices['C'] = '<u>Chaetodon</u> <u>Ocellata</u>.'
                if year == 2022:
                    if qnum == 60:
                        choices = dict(zip('ABCD', ['G̲2', 'G̅2', 'G̲(2)', 'G̅(2)'], strict=True))
                    if qnum in {54, 55, 61, 62}:
                        body.insert(0, SHARED_TABLES_2022[qnum if qnum in SHARED_TABLES_2022 else qnum - 1])
                if year == 2021 and qnum == 37:
                    body.append('Key: solid line = water. Dashed line = blood.')
                if year == 2021 and qnum in {64, 65}:
                    image = crop(page, (91, 140, 350, 315), folder, 'questions-64-65')
                    body[:0] = ['The given diagram shows the plant pigments separated on a paper chromatogram.',
                                f'![Paper chromatogram for questions 64 and 65]({image})']
                assert all(choices.values()), qnum
                item.update(stem=paragraphs(body), choices=choices, **keys[qnum])
                if tab:
                    item['quizStem'] = paragraphs([line for line in body if line != formatted])
                result.append(item)
            else:
                total = re.fullmatch(r'\(Total (\d+) Marks?\)', body.pop(0))
                assert total, qnum
                body = [re.sub(r'\s+_{4,}$', '', text) for text in body]
                item['marks'] = int(total[1])
                if body[0] == 'EITHER':
                    split = body.index('OR')
                    for letter, section in [('a', body[1:split]), ('b', body[split + 1:])]:
                        result.append({**item, 'number': str(qnum) + letter, 'stem': paragraphs(section)})
                else:
                    result.append({**item, 'stem': paragraphs(body)})
    expected = {2017: 30, 2018: 30, 2019: 35, 2021: 65, 2022: 65}.get(year, 50) if part == 1 else 11
    assert printed_numbers == list(range(1, expected + 1)), printed_numbers
    assert sum(q['marks'] for q in result if not q['number'].endswith('b')) == (expected if part == 1 else {2017: 55, 2018: 55, 2019: 50}.get(year, 35))
    return result


def read_key(doc):
    result = {}
    for row in line_text(lines(doc[0])):
        if match := re.fullmatch(r'(\d+)\s+(\d+\.\d+\.\d+(?:,\s*\d+\.\d+\.\d+)*)\s+([A-D](?:,\s*[A-D])*)\s+([KURA])', row):
            number, slo, answer, level = match.groups()
            result[int(number)] = {'originalSlo': slo, 'answer': [a.strip() for a in answer.split(',')], 'level': level}
    assert list(result) == list(range(1, 51)), list(result)
    return result


def read_legacy_key(doc, year):
    rows = {}
    for line in line_text(sorted(lines(doc[0]), key=lambda row: (round(row[0], 1), row[1]))):
        if match := re.fullmatch(r'(\d+) ([A-D]) ([KUA])', line):
            number, answer, level = match.groups()
            rows[int(number)] = {'answer': [answer], 'level': level}
    assert list(rows) == list(range(1, 31 if year <= 2018 else 36)), list(rows)
    return rows


def read_2022_key(doc):
    result = {}
    for page in doc:
        for row in line_text([(y, x, text) for y, x, text in lines(page) if x < 315]):
            if match := re.fullmatch(r'XI-2022 Biology (\d+) ([A-D]) ([KUA]) (.+)', row):
                number, answer, level, slo = match.groups()
                result[int(number)] = {'originalSlo': slo, 'answer': [answer], 'level': level}
    assert list(result) == list(range(1, 51)), list(result)
    for number, (answer, slo, level) in enumerate(ATP_KEY_2022, 51):
        result[number] = {'originalSlo': slo, 'answer': [answer], 'level': level}
    return result


def read_2021_key(doc):
    result = {}
    for page in doc:
        for row in line_text(lines(page)):
            if match := re.fullmatch(r'(\d+) ([\d.; ]+) ([A-D]) (?:([A-D]) )?([NY]) ([1-]) ([1-]) ([1-])', row):
                number, slo, answer, alternate, universal, *levels = match.groups()
                assert levels.count('1') == 1, row
                result[int(number)] = {
                    'originalSlo': slo, 'answer': [answer] + ([alternate] if alternate else []),
                    'level': 'KUA'[levels.index('1')], **({'universal': True} if universal == 'Y' else {}),
                }
    assert list(result) == list(range(1, 66)), list(result)
    return result


def read_legacy_marking(doc, year):
    result, images = {}, {}
    number = section = None
    sample = False
    for page in list(doc)[1:]:
        events = [(y, text, None) for y, _, text in lines(page) if text]
        events += [(image['bbox'][1], '', image['bbox']) for image in page.get_image_info()]
        segments = []
        for _, text, box in sorted(events, key=lambda item: item[0]):
            if match := re.fullmatch(r'Question (\d+)([ab])?:', text):
                printed, letter = match.groups()
                number = printed + (letter or '') if int(printed) >= 10 else printed
                result.setdefault(number, {'page': page.number + 1, 'better': [], 'weaker': [], 'images': {}})
                section = None
                sample = False
            elif number and (response := re.match(r'(?:Most of the )?(better|weaker) responses?\b', text, re.I)):
                section = response[1].lower()
                sample = False
                result[number][section].append(text)
            elif section and re.fullmatch(r'Example(?: \w+)?:', text):
                sample = True
            elif section and sample and box:
                bounds = pymupdf.Rect(box)
                key = (number, section)
                if segments and segments[-1][0] == key and bounds.y0 <= segments[-1][1].y1 + 12:
                    segments[-1][1].include_rect(bounds)
                else:
                    segments.append((key, bounds))
            elif text == 'Extended Response Questions (ERQs)':
                section = None
            elif section and text and not text.startswith('Page '):
                result[number][section].append(text)
                sample = False
        for key, bounds in segments:
            pix = page.get_pixmap(matrix=pymupdf.Matrix(1.7, 1.7), clip=bounds, alpha=False)
            images.setdefault(key, []).append(Image.frombytes('RGB', (pix.width, pix.height), pix.samples))
    assert list(result) == [str(n) for n in range(1, 10)] + ['10a', '10b', '11a', '11b']
    for (number, section), examples in images.items():
        sheet = Image.new('RGB', (max(image.width for image in examples), sum(image.height + 16 for image in examples) - 16), 'white')
        top = 0
        for example in examples:
            sheet.paste(example, (0, top))
            top += example.height + 16
        relative = f'/paper-crops/BIO-XI-{year}-EMARKING/question-{number}-{section}.png'
        target = ROOT / 'public' / relative.lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(target)
        result[number]['images'][section] = relative
    for note in result.values():
        for section in ['better', 'weaker']:
            note[section] = paragraphs(note[section])
            assert note[section] and section in note['images'], note['page']
    return result


def read_marking(doc, year):
    result = {}
    question = None
    section = None
    for page in doc:
        rows = [(y, x, text) for y, x, text in lines(page) if text]
        for index, (y, x, text) in enumerate(rows):
            if match := re.fullmatch(r'Question No\. (\d+)(?:\(?([ab])\)?)?', text):
                number = str(int(match[1])) + (match[2] or '')
                question = result[number] = {'page': page.number + 1, 'images': {}}
                section = None
            if question is None:
                continue
            if x < 64:
                if text == 'Checking':
                    section = 'hints'
                elif text == 'Overall':
                    section = 'overall'
                elif text.startswith('Description'):
                    nearby = [t for yy, xx, t in rows[index + 1:] if yy <= y + 31 and xx < 64]
                    section = 'better' if any(re.search(r'\bBetter\b', label) for label in nearby) else 'weaker'
                elif text == 'SLO No.':
                    section = 'originalSlo'
                elif text.lower().startswith(('question text', 'suggestions for improvement', 'slo text', 'annexure')):
                    section = None
                elif re.fullmatch(r'Images?\s*of', text):
                    nearby = [t for yy, xx, t in rows[index + 1:] if yy <= y + 31 and xx < 64]
                    kind = 'better' if 'Better' in nearby else 'weaker'
                    boundary = next((yy - 5 for yy, xx, t in rows[index + 1:] if xx < 64 and t.startswith(('Description of', 'Suggestions for improvement'))), page.rect.height)
                    boxes = [pymupdf.Rect(i['bbox']) for i in page.get_image_info() if i['bbox'][0] > 108 and y - 12 <= i['bbox'][1] < boundary]
                    if boxes and year != 2023:
                        bounds = boxes[0]
                        for box in boxes[1:]:
                            bounds |= box
                        question['images'][kind] = crop(page, bounds, f'BIO-XI-{year}-EMARKING', f'question-{number}-{kind}')
                    section = None
            elif 110 <= x and section:
                question.setdefault(section, []).append(text)
                if section == 'originalSlo':
                    section = None
    assert list(result) == [str(n) for n in range(1, 10)] + ['10a', '10b', '11a', '11b']
    if year == 2023:
        for number, examples in EXAMPLES_2023.items():
            for kind, segments in zip(('better', 'weaker'), examples, strict=True):
                images = []
                for page_number, top, bottom in segments:
                    page = doc[page_number - 1]
                    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=pymupdf.Rect(113, top - 2, 578, bottom + 2), alpha=False)
                    images.append(Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples))
                composite = Image.new('RGB', (max(image.width for image in images), sum(image.height for image in images)), 'white')
                offset = 0
                for image in images:
                    composite.paste(image, (0, offset))
                    offset += image.height
                relative = f'/paper-crops/BIO-XI-2023-EMARKING/question-{number}-{kind}.png'
                destination = ROOT / 'public' / relative.lstrip('/')
                destination.parent.mkdir(parents=True, exist_ok=True)
                composite.save(destination)
                result[number]['images'][kind] = relative
    for question in result.values():
        for key in ['originalSlo', 'hints', 'overall', 'better', 'weaker']:
            question[key] = paragraphs(question.get(key, []))
            assert question[key], (year, question['page'], key)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder', type=Path)
    parser.add_argument('--year', type=int, choices=[2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025], default=2025)
    args = parser.parse_args()
    folder, year = args.folder, args.year
    if year in {2021, 2022}:
        originals = {'paper-i': f'Biology-XI-Annual-Exam-Paper-{year}.pdf', 'key': f'Biology-XI-Keys-Annual-Exam-Paper-{year}.pdf'}
        read_combined_key = read_2021_key if year == 2021 else read_2022_key
        for kind, filename in originals.items():
            shutil.copyfile(folder / filename, PUBLIC / f'biology-xi-{year}-{kind}.pdf')
        with pymupdf.open(folder / originals['paper-i']) as paper, pymupdf.open(folder / originals['key']) as key:
            assert f'H{year % 100}01-1911110' in paper[0].get_text()
            data = {'mcqs': read_paper(paper, 1, read_combined_key(key), year), 'written': [], 'marking': {}}
        (ROOT / f'data/biology/hssc_xi_{year}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        raise SystemExit
    files = {
        'paper-i': f'Biology-XI-Paper-I-{year}.pdf', 'paper-ii': f'Biology-XI-Paper-II-{year}.pdf',
        'key': f'Biology-XI-Keys-{year}.pdf', 'emarking': 'E-marking-Notes-Biology-XI.pdf' if year == 2023 else f'E-marking-Notes-Biology-XI-{year}.pdf',
    }
    for kind, filename in files.items():
        shutil.copyfile(folder / filename, PUBLIC / f'biology-xi-{year}-{kind}.pdf')
    with pymupdf.open(folder / files['key']) as key, pymupdf.open(folder / files['paper-i']) as first, \
         pymupdf.open(folder / files['paper-ii']) as second, pymupdf.open(folder / files['emarking']) as marking:
        assert (f'May {year}' if year <= 2019 else f'Annual Examinations {year}') in ' '.join(marking[0].get_text().split())
        keys = read_legacy_key(key, year) if year <= 2019 else read_key(key)
        notes = read_legacy_marking(marking, year) if year <= 2019 else read_marking(marking, year)
        data = {'mcqs': read_paper(first, 1, keys, year), 'written': read_paper(second, 2, keys, year), 'marking': notes}
    (ROOT / f'data/biology/hssc_xi_{year}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
