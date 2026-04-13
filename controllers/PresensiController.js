import MuridKelas from "../models/MuridKelasModel.js";
import Presensi from "../models/PresensiModel.js";
import Siswa from "../models/SiswaModel.js";
import { Op, where } from "sequelize";

// >>> BUAT PRESENSI BARU
export const createNewAbsen = async (req, res) => {
  const { tanggal, kelaId } = req.body;
  //   return res.json({ tanggal });
  const tes = await Presensi.findAll({
    where: {
      kelaId: kelaId,
      tanggal: tanggal,
    },
  });

  if (tes.length === 0)
    try {
      const check = await Siswa.findAll({
        include: [
          {
            model: MuridKelas,
            where: {
              kelaId: kelaId,
              status: "aktif",
            },
            // required: true,
          },
        ],
      });
      check.forEach((student) => {
        Presensi.create({
          kelaId: kelaId,
          siswaId: student.id,
          tanggal: tanggal,
          status: "alfa",
        });
      });
      // res.json(check);
      res.json("selamat presensi berhasil dibuat !");
    } catch (error) {
      res.json(error);
    }
  else {
    return res.json({ msg: "sudah ada data!" });
  }
  //   //   else
};

// >>> TAMPIL HALAMAN ABSENSI SETELAH BUAT ABSEN
export const showAfterCreate = async (req, res) => {
  try {
    const show = await Presensi.findAll({
      where: {
        kelaId: req.params.id,
        // status: {
        //   [Op.or]: ["alfa", "izin"],
        // },
        status: "alfa",
        tanggal: req.params.datenya,
      },
      include: [
        {
          model: Siswa,
          // required: true,
        },
      ],
    });
    res.json(show);
  } catch (error) {}
};

// >>> UNTUK ISI KEHADIRANNYA
export const isiKehadiran = async (req, res) => {
  const { idPresensi, statusnya } = req.body;
  //   return res.json(req.body);
  try {
    await Presensi.update(
      {
        status: statusnya,
      },
      {
        where: {
          id: idPresensi,
        },
      }
    );
    res.json("berhasil presensi");
  } catch (error) {
    res.json(error);
  }
};

// >>> DAFTAR PRESENSI PERKELAS
export const listPresensi = async (req, res) => {
  try {
    const data = await Presensi.findAll({
      where: {
        kelaId: req.params.id,
      },
      include: {
        model: Siswa,
      },
    });
    res.status(200).json(data);
  } catch (error) {
    res.json(error);
  }
};
